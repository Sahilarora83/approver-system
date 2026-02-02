import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import * as fs from "fs";
import * as path from "path";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

import sessionFileStore from "session-file-store";

const FileStore = sessionFileStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Global Request Logger for Debugging
  app.use((req, res, next) => {
    if (!req.url.startsWith('/static')) { // Ignore static assets
      console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
    }
    next();
  });

  app.use(
    session({
      store: new FileStore({
        path: path.join(process.cwd(), ".sessions"),
        ttl: 86400, // 1 day
        reapInterval: 3600,
        retries: 0,
      }),
      secret: process.env.SESSION_SECRET || "qr-ticket-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );

  const requireAuth = (req: Request, res: Response, next: Function) => {
    console.log(`[API Request] ${req.method} ${req.url}`);
    if (!req.session.userId) {
      console.log(`[API Auth] Failed for ${req.url}`);
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const notifyUser = async (userId: string, title: string, body: string, type: string, relatedId?: string) => {
    try {
      // 1. Save in DB for in-app Notifications Screen
      await storage.createNotification({
        userId,
        title,
        body,
        type,
        relatedId: relatedId || null,
        read: false
      });
      console.log(`[Notification] To user ${userId}: ${title} - ${body}`);

      // 2. Send REAL Push Notification (Outside the app)
      const user = await storage.getUser(userId);
      if (user?.pushToken) {
        console.log(`[Push] Sending to token: ${user.pushToken}`);
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: user.pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: { relatedId, type },
            priority: 'high',
            channelId: 'default',
          }),
        });
        const resData = await response.json();
        console.log(`[Push] Expo Response:`, JSON.stringify(resData));
      }
    } catch (error) {
      console.error("[Notification Error]", error);
    }
  };

  // Notifications API
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.session.userId!);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationAsRead(String(req.params.id));
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.post("/api/user/push-token", requireAuth, async (req, res) => {
    try {
      const { pushToken } = req.body;
      await storage.updateUser(req.session.userId!, { pushToken });
      res.json({ message: "Push token updated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update push token" });
    }
  });

  app.post("/api/upload", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ message: "No image provided" });

      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = path.join(process.cwd(), "uploads", fileName);

      if (!fs.existsSync(path.join(process.cwd(), "uploads"))) {
        await fs.promises.mkdir(path.join(process.cwd(), "uploads"));
      }

      await fs.promises.writeFile(filePath, buffer);

      const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
      const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
      const fileUrl = `${protocol}://${host}/uploads/${fileName}`;

      res.json({ url: fileUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, name, role } = req.body;
      if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password, and name are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        name,
        role: role || "participant",
      });

      // HEALING: Link any guest registrations to this new user account
      await storage.linkRegistrationsToUser(email, user.id);

      req.session.userId = user.id;
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          bio: user.bio,
          profileImage: (user as any).profileImage || null,
        },
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // HEALING: Link any guest registrations to this user account (in case they were guests before)
      await storage.linkRegistrationsToUser(email, user.id);

      req.session.userId = user.id;
      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          bio: user.bio,
          profileImage: (user as any).profileImage || null,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        bio: user.bio,
        profileImage: (user as any).profileImage,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.patch("/api/user", requireAuth, async (req, res) => {
    try {
      const { name, bio, profileImage } = req.body;
      const updatedUser = await storage.updateUser(req.session.userId!, { name, bio, profileImage } as any);
      if (!updatedUser) return res.status(404).json({ message: "User not found" });

      res.json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          bio: updatedUser.bio,
          profileImage: (updatedUser as any).profileImage,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/user/follow/:id", requireAuth, async (req, res) => {
    try {
      const followingId = req.params.id;
      if (followingId === req.session.userId) {
        return res.status(400).json({ message: "You cannot follow yourself" });
      }
      await storage.followUser(req.session.userId!, String(followingId));

      // Get follower's name for notification
      const follower = await storage.getUser(req.session.userId!);

      // Create notification for the followed user
      await storage.createNotification({
        userId: String(followingId),
        title: "New Follower",
        body: `${follower?.name || 'Someone'} started following you`,
        type: "follow",
        relatedId: req.session.userId!,
        read: false,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete("/api/user/follow/:id", requireAuth, async (req, res) => {
    try {
      await storage.unfollowUser(req.session.userId!, String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  app.get("/api/user/follow/:id/status", requireAuth, async (req, res) => {
    try {
      const following = await storage.isFollowing(req.session.userId!, String(req.params.id));
      res.json({ following });
    } catch (error) {
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });

  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  app.get("/api/admin/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getAdminStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/events/feed", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const events = await storage.getAllEvents(limit, offset);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to get events feed" });
    }
  });

  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getEvents(req.session.userId!);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to get events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEvent(String(req.params.id));
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  app.get("/api/events/:id/registration-status", async (req, res) => {
    try {
      const eventId = String(req.params.id);
      const emailParam = req.query.email as string | undefined;

      console.log(`[StatusAPI] Checking status for Event: ${eventId}, Email param: ${emailParam}`);

      // Check if user is authenticated
      const userId = req.session.userId;

      let registration = null;

      if (userId) {
        // User is logged in - check by userId first, then email
        console.log(`[StatusAPI] User logged in: ${userId}`);
        const user = await storage.getUser(userId);
        if (user) {
          console.log(`[StatusAPI] User email: ${user.email}`);
          registration = await storage.getRegistrationForUserEvent(userId, eventId);
          console.log(`[StatusAPI] Registration by userId:`, registration ? registration.id : 'not found');

          if (!registration) {
            const normalizedEmail = user.email.toLowerCase().trim();
            console.log(`[StatusAPI] Checking by email: ${normalizedEmail}`);
            registration = await storage.getRegistrationByEmailForEvent(normalizedEmail, eventId);
            console.log(`[StatusAPI] Registration by email:`, registration ? registration.id : 'not found');
          }
        }
      } else if (emailParam) {
        // User not logged in but provided email - check by email only
        const normalizedEmail = emailParam.toLowerCase().trim();
        console.log(`[StatusAPI] Not logged in, checking by email param: ${normalizedEmail}`);
        registration = await storage.getRegistrationByEmailForEvent(normalizedEmail, eventId);
        console.log(`[StatusAPI] Registration by email param:`, registration ? registration.id : 'not found');
      }

      console.log(`[StatusAPI] Final registration:`, registration ? { id: registration.id, status: registration.status } : null);
      res.json({ registration: registration ? { ...registration } : null });
    } catch (error) {
      console.error("Registration status error:", error);
      res.status(500).json({ message: "Failed to check registration status" });
    }
  });

  // Get user's tickets (approved registrations)
  app.get("/api/my-tickets", async (req, res) => {
    try {
      const emailParam = req.query.email as string | undefined;
      const userId = req.session.userId;

      console.log(`[MyTickets] UserId: ${userId}, Email param: ${emailParam}`);

      let registrations: any[] = [];

      if (userId) {
        // User is logged in - get by userId
        const user = await storage.getUser(userId);
        if (user) {
          console.log(`[MyTickets] Fetching tickets for logged-in user: ${userId}, email: ${user.email}`);
          registrations = await storage.getUserRegistrations(userId);

          // Also get by email if different
          if (user.email) {
            const emailRegs = await storage.getUserRegistrationsByEmail(user.email.toLowerCase().trim());
            // Merge and deduplicate
            const regIds = new Set(registrations.map((r: any) => r.id));
            emailRegs.forEach((r: any) => {
              if (!regIds.has(r.id)) {
                registrations.push(r);
              }
            });
          }
        }
      } else if (emailParam) {
        // User not logged in but provided email
        const normalizedEmail = emailParam.toLowerCase().trim();
        console.log(`[MyTickets] Fetching tickets for email: ${normalizedEmail}`);
        registrations = await storage.getUserRegistrationsByEmail(normalizedEmail);
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log(`[MyTickets] Found ${registrations.length} total registrations`);

      // Filter only approved/checked-in/checked-out tickets
      const approvedTickets = registrations.filter((t: any) =>
        ['approved', 'checked_in', 'checked_out'].includes(t.status)
      );

      console.log(`[MyTickets] Returning ${approvedTickets.length} approved tickets`);
      res.json(approvedTickets);
    } catch (error) {
      console.error("My tickets error:", error);
      res.status(500).json({ message: "Failed to get tickets" });
    }
  });

  app.patch("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const { title, description, location, startDate, endDate, requiresApproval, checkInEnabled, formFields, coverImage, hostedBy, socialLinks } = req.body;
      const eventId = String(req.params.id);
      const event = await storage.getEvent(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.organizerId !== req.session.userId) return res.status(403).json({ message: "Unauthorized" });

      // Parse formFields and socialLinks if they're strings
      let parsedFormFields = formFields;
      let parsedSocialLinks = socialLinks;

      if (typeof formFields === 'string') {
        try {
          parsedFormFields = JSON.parse(formFields);
        } catch (e) {
          console.error('[UpdateEvent] Failed to parse formFields:', e);
          return res.status(400).json({ message: "Invalid formFields format" });
        }
      }

      if (typeof socialLinks === 'string') {
        try {
          parsedSocialLinks = JSON.parse(socialLinks);
        } catch (e) {
          console.error('[UpdateEvent] Failed to parse socialLinks:', e);
          return res.status(400).json({ message: "Invalid socialLinks format" });
        }
      }

      const updatedEvent = await storage.updateEvent(eventId, {
        title,
        description,
        location,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        requiresApproval,
        checkInEnabled,
        formFields: parsedFormFields,
        coverImage,
        hostedBy,
        socialLinks: parsedSocialLinks
      });
      res.json(updatedEvent);
    } catch (error) {
      console.error('[UpdateEvent] Error:', error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  // BROADCAST ROUTE (MOVED UP FOR BETTER MATCHING)
  app.post("/api/events/:id/broadcast", requireAuth, async (req, res) => {
    const eventId = String(req.params.id);
    console.log(`[Broadcast] HIT: ${eventId}`);
    try {
      const { title, message } = req.body;
      if (!message) {
        console.log(`[Broadcast] Error: Message missing`);
        return res.status(400).json({ message: "Message is required" });
      }

      const event = await storage.getEvent(eventId);
      if (!event) {
        console.log(`[Broadcast] Error: Event ${eventId} not found`);
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.organizerId !== req.session.userId) {
        console.log(`[Broadcast] Error: Unauthorized attempt by user ${req.session.userId}`);
        return res.status(403).json({ message: "Unauthorized. Only organizer can broadcast." });
      }

      const registrations = await storage.getRegistrations(eventId);
      console.log(`[Broadcast] Found ${registrations.length} total registrations`);

      // 1. Collect all explicit User IDs
      const explicitUserIds = registrations.map(r => r.userId).filter(id => id !== null && id !== req.session.userId) as string[];

      // 2. Resolve Guest Registrants (null userId) by email
      const guestEmails = registrations.filter(r => r.userId === null).map(r => r.email);
      const guestUserIds: string[] = [];

      if (guestEmails.length > 0) {
        console.log(`[Broadcast] Attempting to resolve ${guestEmails.length} guest emails to user accounts...`);
        for (const email of guestEmails) {
          const guestUser = await storage.getUserByEmail(email);
          if (guestUser && guestUser.id !== req.session.userId) {
            guestUserIds.push(guestUser.id);
          }
        }
      }

      const participantIds = [...new Set([...explicitUserIds, ...guestUserIds])];
      console.log(`[Broadcast] Identified ${participantIds.length} unique in-app participants to notify (${explicitUserIds.length} explicit, ${guestUserIds.length} resolved from guests)`);

      // 3. Notify Participants
      await Promise.all(participantIds.map(async (userId) => {
        console.log(`[Broadcast] Notifying user ${userId}`);
        await notifyUser(userId, title || `Update: ${event.title}`, message, "broadcast", event.id);
      }));

      // 4. Save history in DB
      console.log(`[Broadcast] Saving history to DB...`);
      try {
        await storage.createBroadcast({
          eventId,
          organizerId: req.session.userId!,
          title: title || `Update: ${event.title}`,
          message
        });
        console.log(`[Broadcast] History saved successfully`);
      } catch (e: any) {
        console.error("[Broadcast History Error] Failed to save history:", e.message);
      }

      res.json({ message: `Broadcast sent to ${participantIds.length} participants` });
    } catch (error: any) {
      console.error("[Broadcast Error]", error);
      res.status(500).json({ message: "Internal server error during broadcast", details: error.message });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const eventId = String(req.params.id);
      const event = await storage.getEvent(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.organizerId !== req.session.userId) return res.status(403).json({ message: "Unauthorized" });

      const success = await storage.deleteEvent(eventId);
      if (!success) return res.status(500).json({ message: "Failed to delete event" });
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const { title, description, location, startDate, endDate, requiresApproval, checkInEnabled, formFields, coverImage, hostedBy, socialLinks } = req.body;
      if (!title || !startDate) return res.status(400).json({ message: "Title and start date are required" });

      let parsedFormFields = formFields;
      let parsedSocialLinks = socialLinks;

      if (typeof formFields === 'string') {
        try {
          parsedFormFields = JSON.parse(formFields);
        } catch (e) {
          console.error('[CreateEvent] Failed to parse formFields:', e);
          return res.status(400).json({ message: "Invalid formFields format" });
        }
      }

      if (typeof socialLinks === 'string') {
        try {
          parsedSocialLinks = JSON.parse(socialLinks);
        } catch (e) {
          console.error('[CreateEvent] Failed to parse socialLinks:', e);
          return res.status(400).json({ message: "Invalid socialLinks format" });
        }
      }

      const event = await storage.createEvent({
        organizerId: req.session.userId!,
        title,
        description: description || null,
        location: location || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        requiresApproval: requiresApproval || false,
        checkInEnabled: checkInEnabled !== false,
        formFields: parsedFormFields || [],
        coverImage: coverImage || null,
        hostedBy: hostedBy || null,
        socialLinks: parsedSocialLinks || {},
      });

      // Notify followers
      const followers = await storage.getFollowers(req.session.userId!);
      await Promise.all(followers.map(followerId =>
        notifyUser(followerId, "New Event", `A new event "${event.title}" was just posted!`, "new_event", event.id)
      ));

      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events/:id/registrations", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const registrations = await storage.getRegistrations(String(req.params.id), limit, offset);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get registrations" });
    }
  });

  app.get("/api/events/public/:link", async (req, res) => {
    try {
      const event = await storage.getEventByPublicLink(req.params.link);
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  app.post("/api/events/public/:link/register", async (req, res) => {
    try {
      const event = await storage.getEventByPublicLink(req.params.link);
      if (!event) return res.status(404).json({ message: "Event not found" });

      const { name, email, phone, formData } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email are required" });

      const normalizedEmail = email.toLowerCase().trim();

      // Check for duplicate registration
      const existing = await storage.getRegistrationByEmailForEvent(normalizedEmail, event.id);
      if (existing) {
        return res.status(400).json({ message: "You are already registered for this event" });
      }

      const initialStatus = event.requiresApproval ? "pending" : "approved";

      const sessionUserId = req.session.userId;
      console.log(`[Register] User: ${sessionUserId}, Event: ${event.id}, Email: ${normalizedEmail}`);

      const registration = await storage.createRegistration({
        eventId: event.id,
        userId: sessionUserId || null,
        name,
        email: normalizedEmail,
        phone: phone || null,
        formData: formData || {},
        status: initialStatus,
      });

      console.log(`[Register] Created: ${registration.id} for User: ${registration.userId}`);

      // Notify organizer
      await notifyUser(event.organizerId, "New Registration", `${name} just registered for "${event.title}"`, "new_registration", event.id);

      // Notify Participant (if they are a registered app user)
      if (registration.userId) {
        const isPending = initialStatus === 'pending';
        const title = "Registration Successful! 🎟️";
        const body = isPending
          ? `You have successfully registered for "${event.title}". Your ticket is pending approval.`
          : `You have successfully registered for "${event.title}". Your ticket is ready!`;

        await notifyUser(registration.userId, title, body, "registration_successful", registration.id);
      }

      res.json({ registration: { ...registration } });
    } catch (error) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.get("/api/registrations/:id", async (req, res) => {
    try {
      const registration = await storage.getRegistration(req.params.id);
      if (!registration) return res.status(404).json({ message: "Registration not found" });
      res.json(registration);
    } catch (error) {
      res.status(500).json({ message: "Failed to get registration" });
    }
  });

  app.patch("/api/registrations/:id/status", requireAuth, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "approved", "rejected", "checked_in", "checked_out"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const registration = await storage.updateRegistrationStatus(String(req.params.id), status);
      if (!registration) return res.status(404).json({ message: "Registration not found" });

      // Notify participant
      if (registration.userId) {
        let title = "Registration Update";
        let body = `Your registration for "${registration.status}" has been updated.`;

        if (status === "approved") {
          title = "Ticket Approved! 🎟️";
          body = `Your ticket for the event has been approved! Tap to view your ticket.`;
        } else if (status === "rejected") {
          title = "Registration Update";
          body = `Unfortunately, your registration for the event was not approved.`;
        } else if (status === "checked_in") {
          title = "Checked In! ✅";
          body = `You've successfully checked in. Have a great time!`;
        }

        await notifyUser(registration.userId, title, body, `registration_${status}`, registration.id);
      }

      res.json({ ...registration });
    } catch (error) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.post("/api/registrations/bulk-update", requireAuth, async (req, res) => {
    try {
      const { registrationIds, status } = req.body;
      if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
        return res.status(400).json({ message: "Invalid registration IDs" });
      }
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const results = await Promise.all(
        registrationIds.map(id => storage.updateRegistrationStatus(String(id), status))
      );

      const successful = results.filter(r => r !== undefined);
      res.json({
        message: `Updated ${successful.length} of ${registrationIds.length} registrations`,
        updated: successful.length,
        total: registrationIds.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to bulk update registrations" });
    }
  });

  app.get("/api/my-tickets", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });

      const tickets = await storage.getUserRegistrationsByEmail(user.email);
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tickets" });
    }
  });

  app.post("/api/verify", requireAuth, async (req, res) => {
    try {
      const { qrCode } = req.body;
      if (!qrCode) return res.status(400).json({ message: "QR code is required" });

      const registration = await storage.getRegistrationByQR(qrCode);
      if (!registration) return res.status(404).json({ message: "Invalid QR code" });

      res.json({
        registration: {
          id: registration.id,
          name: registration.name,
          email: registration.email,
          status: registration.status,
          event: { title: registration.event.title },
        },
        alreadyCheckedIn: registration.status === "checked_in",
      });
    } catch (error) {
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/check-in", requireAuth, async (req, res) => {
    try {
      const { registrationId, type } = req.body;
      if (!registrationId || !["check_in", "check_out"].includes(type)) return res.status(400).json({ message: "Invalid request" });

      const registration = await storage.getRegistration(registrationId);
      if (!registration) return res.status(404).json({ message: "Registration not found" });

      if (registration.status === "rejected") return res.status(400).json({ message: "Registration was rejected" });
      if (registration.status === "pending") return res.status(400).json({ message: "Registration is pending approval" });

      const newStatus = type === "check_in" ? "checked_in" : "checked_out";
      await storage.updateRegistrationStatus(registrationId, newStatus);
      await storage.createCheckIn({
        registrationId,
        verifierId: req.session.userId || null,
        type,
      });

      res.json({ message: `${type === "check_in" ? "Checked in" : "Checked out"} successfully` });
    } catch (error) {
      res.status(500).json({ message: "Check-in failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
