import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import pgSession from "connect-pg-simple";
import bcrypt from "bcryptjs";
import pg from "pg";
import { storage } from "./storage";

const PgSession = pgSession(session);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
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
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

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

      req.session.userId = user.id;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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

      req.session.userId = user.id;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.get("/api/admin/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getAdminStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const events = await storage.getEvents(req.session.userId!);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to get events" });
    }
  });

  app.get("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const { title, description, location, startDate, endDate, requiresApproval, checkInEnabled, formFields } = req.body;

      if (!title || !startDate) {
        return res.status(400).json({ message: "Title and start date are required" });
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
        formFields: formFields || [],
      });

      res.json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get("/api/events/:id/registrations", requireAuth, async (req, res) => {
    try {
      const registrations = await storage.getRegistrations(req.params.id);
      res.json(registrations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get registrations" });
    }
  });

  app.get("/api/events/public/:link", async (req, res) => {
    try {
      const event = await storage.getEventByPublicLink(req.params.link);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Failed to get event" });
    }
  });

  app.post("/api/events/public/:link/register", async (req, res) => {
    try {
      const event = await storage.getEventByPublicLink(req.params.link);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      const { name, email, phone, formData } = req.body;

      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const initialStatus = event.requiresApproval ? "pending" : "approved";

      const registration = await storage.createRegistration({
        eventId: event.id,
        userId: null,
        name,
        email,
        phone: phone || null,
        formData: formData || {},
        status: initialStatus,
      });

      res.json(registration);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.get("/api/registrations/:id", async (req, res) => {
    try {
      const registration = await storage.getRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
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

      const registration = await storage.updateRegistrationStatus(req.params.id, status);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      res.json(registration);
    } catch (error) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.get("/api/my-tickets", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const tickets = await storage.getUserRegistrationsByEmail(user.email);
      res.json(tickets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get tickets" });
    }
  });

  app.post("/api/verify", requireAuth, async (req, res) => {
    try {
      const { qrCode } = req.body;

      if (!qrCode) {
        return res.status(400).json({ message: "QR code is required" });
      }

      const registration = await storage.getRegistrationByQR(qrCode);
      if (!registration) {
        return res.status(404).json({ message: "Invalid QR code" });
      }

      const alreadyCheckedIn = registration.status === "checked_in";

      res.json({
        registration: {
          id: registration.id,
          name: registration.name,
          email: registration.email,
          status: registration.status,
          event: {
            title: registration.event.title,
          },
        },
        alreadyCheckedIn,
      });
    } catch (error) {
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/check-in", requireAuth, async (req, res) => {
    try {
      const { registrationId, type } = req.body;

      if (!registrationId || !["check_in", "check_out"].includes(type)) {
        return res.status(400).json({ message: "Invalid request" });
      }

      const registration = await storage.getRegistration(registrationId);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      if (registration.status === "rejected") {
        return res.status(400).json({ message: "Registration was rejected" });
      }

      if (registration.status === "pending") {
        return res.status(400).json({ message: "Registration is pending approval" });
      }

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
