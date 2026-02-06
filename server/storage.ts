import { supabase, toCamelCase, toSnakeCase } from "./supabase";
import type { User, Event, Registration, CheckIn, InsertUser, Notification, Favorite, Review } from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  followUser(followerId: string, followingId: string): Promise<void>;
  unfollowUser(followerId: string, followingId: string): Promise<void>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;

  getEvents(organizerId: string): Promise<(Event & { registrationCount: number })[]>;
  getAllEvents(limit?: number, offset?: number): Promise<(Event & { registrationCount: number })[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventByPublicLink(link: string): Promise<Event | undefined>;
  createEvent(event: Omit<Event, "id" | "createdAt" | "publicLink">): Promise<Event>;
  updateEvent(id: string, data: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  getRegistrationForUserEvent(userId: string, eventId: string): Promise<Registration | undefined>;
  getRegistrationByEmailForEvent(email: string, eventId: string): Promise<Registration | undefined>;

  getRegistrations(eventId: string, limit?: number, offset?: number): Promise<Registration[]>;
  getRegistration(id: string): Promise<(Registration & { event: Event }) | undefined>;
  getRegistrationByQR(qrCode: string): Promise<(Registration & { event: Event }) | undefined>;
  getUserRegistrations(userId: string): Promise<(Registration & { event: Event })[]>;
  getUsersWithTokens(userIds: string[]): Promise<{ id: string, pushToken: string | null }[]>;
  getUserRegistrationsByEmail(email: string): Promise<(Registration & { event: Event })[]>;
  createRegistration(data: Omit<Registration, "id" | "createdAt" | "qrCode" | "ticketLink">): Promise<Registration>;
  updateRegistrationStatus(id: string, status: string): Promise<Registration | undefined>;

  createCheckIn(data: Omit<CheckIn, "id" | "timestamp">): Promise<CheckIn>;
  getCheckIns(registrationId: string): Promise<CheckIn[]>;

  getAdminStats(organizerId: string): Promise<{
    totalEvents: number;
    totalRegistrations: number;
    totalCheckedIn: number;
    totalPending: number;
  }>;

  getUserStats(userId: string): Promise<{
    createdEvents: number;
    participatedEvents: number;
    tickets: number;
    following: number;
    unreadNotifications: number;
  }>;
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(data: Omit<Notification, "id" | "createdAt">): Promise<Notification>;
  createNotificationsBulk(data: Omit<Notification, "id" | "createdAt">[]): Promise<void>;
  markNotificationAsRead(id: string): Promise<void>;
  getFollowers(userId: string): Promise<string[]>;
  createBroadcast(data: { eventId: string; organizerId: string; title?: string; message: string }): Promise<void>;
  linkRegistrationsToUser(email: string, userId: string): Promise<void>;

  // Favorites
  getFavorites(userId: string): Promise<(Favorite & { event: Event })[]>;
  addFavorite(userId: string, eventId: string): Promise<void>;
  removeFavorite(userId: string, eventId: string): Promise<void>;
  isFavorited(userId: string, eventId: string): Promise<boolean>;

  // Reviews
  getReviews(eventId: string): Promise<(Review & { user: User })[]>;
  createReview(data: Omit<Review, "id" | "createdAt">): Promise<Review>;

  getEventAttendees(eventId: string, currentUserId?: string): Promise<(User & { isFollowing: boolean })[]>;
  searchEvents(params: {
    query?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: (Event & { registrationCount: number })[]; total: number }>;
}

export class SupabaseStorage implements IStorage {
  async getUsersWithTokens(userIds: string[]): Promise<{ id: string, pushToken: string | null }[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, push_token')
      .in('id', userIds);

    if (error) throw new Error(error.message);
    return data.map((u: any) => ({ id: u.id, pushToken: u.push_token }));
  }

  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return undefined;
    return toCamelCase(data) as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: insertUser.email,
        password: insertUser.password,
        name: insertUser.name,
        role: insertUser.role || 'participant',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toCamelCase(data) as User;
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .update(toSnakeCase(updateData))
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return toCamelCase(data) as User;
  }

  async followUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: followerId,
        following_id: followingId,
      });

    if (error) throw new Error(error.message);
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw new Error(error.message);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();

    if (error) return false;
    return !!data;
  }

  async getEvents(organizerId: string): Promise<(Event & { registrationCount: number })[]> {
    const { data: events, error } = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(profile_image), registrations(count)')
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    if (!events || events.length === 0) return [];

    return events.map((event: any) => {
      const transformed = toCamelCase(event) as any;
      if (event.users) {
        transformed.organizerProfileImage = event.users.profile_image;
      }

      return {
        ...transformed,
        registrationCount: event.registrations?.[0]?.count || 0,
      } as Event & { registrationCount: number };
    });

  }

  async getAllEvents(limit: number = 20, offset: number = 0): Promise<(Event & { registrationCount: number })[]> {
    const { data: events, error } = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(profile_image), registrations(count)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    if (!events || events.length === 0) return [];

    return events.map((event: any) => {
      const transformed = toCamelCase(event) as any;
      if (event.users) {
        transformed.organizerProfileImage = event.users.profile_image;
      }

      return {
        ...transformed,
        registrationCount: event.registrations?.[0]?.count || 0,
      } as Event & { registrationCount: number };
    });

  }

  async getEvent(id: string): Promise<Event | undefined> {
    const { data, error } = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(profile_image)')
      .eq('id', id)
      .single();

    if (error) return undefined;
    const transformed = toCamelCase(data);
    if (data.users) {
      transformed.organizerProfileImage = data.users.profile_image;
    }
    return transformed as Event;
  }

  async getEventByPublicLink(link: string): Promise<Event | undefined> {
    const { data, error } = await supabase
      .from('events')
      .select('*, users!events_organizer_id_fkey(profile_image)')
      .eq('public_link', link)
      .single();

    if (error) return undefined;
    const transformed = toCamelCase(data);
    if (data.users) {
      transformed.organizerProfileImage = data.users.profile_image;
    }
    return transformed as Event;
  }

  async createEvent(eventData: Omit<Event, "id" | "createdAt" | "publicLink">): Promise<Event> {
    const publicLink = randomUUID().slice(0, 8);
    const { data, error } = await supabase
      .from('events')
      .insert({
        organizer_id: eventData.organizerId,
        title: eventData.title,
        description: eventData.description,
        category: eventData.category,
        location: eventData.location,
        address: eventData.address,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        price: eventData.price,
        start_date: eventData.startDate,
        end_date: eventData.endDate,
        requires_approval: eventData.requiresApproval,
        check_in_enabled: eventData.checkInEnabled,
        form_fields: eventData.formFields,
        public_link: publicLink,
        cover_image: eventData.coverImage,
        gallery: eventData.gallery,
        price_packages: eventData.pricePackages,
        hosted_by: eventData.hostedBy,
        social_links: eventData.socialLinks || {},
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toCamelCase(data) as Event;
  }

  async updateEvent(id: string, updateData: Partial<Event>): Promise<Event | undefined> {
    const { data, error } = await supabase
      .from('events')
      .update(toSnakeCase(updateData))
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return toCamelCase(data) as Event;
  }

  async getRegistrationForUserEvent(userId: string, eventId: string): Promise<Registration | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) return undefined;
    return toCamelCase(data) as Registration;
  }

  async getRegistrationByEmailForEvent(email: string, eventId: string): Promise<Registration | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('email', email)
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) return undefined;
    return toCamelCase(data) as Registration;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    return !error;
  }

  async getRegistrations(
    eventId: string,
    limit: number = 50,
    offset: number = 0,
    search?: string,
    status?: string
  ): Promise<Registration[]> {
    let query = supabase
      .from('registrations')
      .select(`
        *,
        users!registrations_user_id_fkey (
          profile_image
        )
      `)
      .eq('event_id', eventId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      // Use efficient text search if indexed, otherwise fallback to ilike
      // Supabase's .or() is powerful for multiple field searching
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return (data || []).map((item: any) => {
      const registration = toCamelCase(item) as any;
      // Add profile image from joined user data
      if (item.users) {
        registration.profileImage = item.users.profile_image;
      }
      // Remove the users object as we've extracted what we need
      delete registration.users;
      return registration;
    }) as Registration[];
  }

  async getRegistration(id: string): Promise<(Registration & { event: Event }) | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, events(*)')
      .eq('id', id)
      .single();

    if (error) return undefined;

    const { events, ...registration } = data;
    return {
      ...toCamelCase(registration),
      event: toCamelCase(events)
    } as Registration & { event: Event };
  }

  async getRegistrationByQR(qrCode: string): Promise<(Registration & { event: Event }) | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, events(*)')
      .eq('qr_code', qrCode)
      .single();

    if (error) return undefined;

    const { events, ...registration } = data;
    return {
      ...toCamelCase(registration),
      event: toCamelCase(events)
    } as Registration & { event: Event };
  }

  async getUserRegistrations(userId: string): Promise<(Registration & { event: Event })[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, events(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(({ events, ...registration }) => ({
      ...toCamelCase(registration),
      event: toCamelCase(events),
    })) as (Registration & { event: Event })[];
  }

  async getUserRegistrationsByEmail(email: string): Promise<(Registration & { event: Event })[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select('*, events(*)')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return (data || []).map(({ events, ...registration }) => ({
      ...toCamelCase(registration),
      event: toCamelCase(events),
    })) as (Registration & { event: Event })[];
  }

  async createRegistration(
    regData: Omit<Registration, "id" | "createdAt" | "qrCode" | "ticketLink">
  ): Promise<Registration> {
    const qrCode = `QR-${randomUUID()}`;
    const ticketLink = `ticket-${randomUUID().slice(0, 12)}`;

    const { data, error } = await supabase
      .from('registrations')
      .insert({
        event_id: regData.eventId,
        user_id: regData.userId,
        name: regData.name,
        email: regData.email,
        phone: regData.phone,
        form_data: regData.formData,
        status: regData.status,
        qr_code: qrCode,
        ticket_link: ticketLink,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toCamelCase(data) as Registration;
  }

  async updateRegistrationStatus(id: string, status: string): Promise<Registration | undefined> {
    const { data, error } = await supabase
      .from('registrations')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return undefined;
    return toCamelCase(data) as Registration;
  }

  async createCheckIn(checkInData: Omit<CheckIn, "id" | "timestamp">): Promise<CheckIn> {
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        registration_id: checkInData.registrationId,
        verifier_id: checkInData.verifierId,
        type: checkInData.type,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as CheckIn;
  }

  async getCheckIns(registrationId: string): Promise<CheckIn[]> {
    const { data, error } = await supabase
      .from('check_ins')
      .select('*')
      .eq('registration_id', registrationId)
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return data as CheckIn[];
  }

  async getAdminStats(organizerId: string): Promise<{
    totalEvents: number;
    totalRegistrations: number;
    totalCheckedIn: number;
    totalPending: number;
  }> {
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', organizerId);

    const { data: events } = await supabase
      .from('events')
      .select('id')
      .eq('organizer_id', organizerId);

    const eventIds = (events || []).map(e => e.id);

    if (eventIds.length === 0) {
      return {
        totalEvents: 0,
        totalRegistrations: 0,
        totalCheckedIn: 0,
        totalPending: 0,
      };
    }

    const { count: totalRegistrations } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds);

    const { count: totalCheckedIn } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .eq('status', 'checked_in');

    const { count: totalPending } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .eq('status', 'pending');

    return {
      totalEvents: totalEvents || 0,
      totalRegistrations: totalRegistrations || 0,
      totalCheckedIn: totalCheckedIn || 0,
      totalPending: totalPending || 0,
    };
  }

  async getUserStats(userId: string): Promise<{
    createdEvents: number;
    participatedEvents: number;
    tickets: number;
    following: number;
    unreadNotifications: number;
  }> {
    const { count: createdEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('organizer_id', userId);

    const { count: tickets } = await supabase
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: following } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    const { count: unreadNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    return {
      createdEvents: createdEvents || 0,
      participatedEvents: tickets || 0,
      tickets: tickets || 0,
      following: following || 0,
      unreadNotifications: unreadNotifications || 0,
    };
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(toCamelCase) as Notification[];
  }

  async createNotification(data: Omit<Notification, "id" | "createdAt">): Promise<Notification> {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert(toSnakeCase(data))
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toCamelCase(notification) as Notification;
  }

  async createNotificationsBulk(data: Omit<Notification, "id" | "createdAt">[]): Promise<void> {
    if (data.length === 0) return;
    const { error } = await supabase
      .from('notifications')
      .insert(toSnakeCase(data));

    if (error) throw new Error(error.message);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw new Error(error.message);
  }

  async getFollowers(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (error) throw new Error(error.message);
    return (data || []).map(f => f.follower_id);
  }

  async createBroadcast(data: { eventId: string; organizerId: string; title?: string; message: string }): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Storage] Creating broadcast for event ${data.eventId} by ${data.organizerId}`);
    }
    const { error } = await supabase
      .from('broadcasts')
      .insert(toSnakeCase(data));

    if (error) {
      console.error(`[Storage Error] Broadcast Insert failed: ${error.message}`);
      throw new Error(error.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Storage] Broadcast stored successfully`);
    }
  }

  async linkRegistrationsToUser(email: string, userId: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Storage] Linking guest registrations for ${email} to user ${userId}`);
    }
    const { error } = await supabase
      .from('registrations')
      .update({ user_id: userId })
      .eq('email', email.toLowerCase().trim())
      .is('user_id', null);

    if (error) {
      console.error(`[Storage Error] Failed to link registrations: ${error.message}`);
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[Storage] Successfully linked registrations for ${email}`);
    }
  }

  // Favorites Implementation
  async getFavorites(userId: string): Promise<(Favorite & { event: Event })[]> {
    const { data, error } = await supabase
      .from('favorites')
      .select('*, event:events(*)')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return (data || []).map(f => ({
      ...toCamelCase(f),
      event: toCamelCase(f.event)
    })) as (Favorite & { event: Event })[];
  }

  async addFavorite(userId: string, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: userId, event_id: eventId });
    if (error) throw new Error(error.message);
  }

  async removeFavorite(userId: string, eventId: string): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('event_id', eventId);
    if (error) throw new Error(error.message);
  }

  async isFavorited(userId: string, eventId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .maybeSingle();
    if (error) return false;
    return !!data;
  }

  // Reviews Implementation
  async getReviews(eventId: string): Promise<(Review & { user: User })[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, user:users(*)')
      .eq('event_id', eventId);

    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
      ...toCamelCase(r),
      user: toCamelCase(r.user)
    })) as (Review & { user: User })[];
  }

  async createReview(data: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const { data: review, error } = await supabase
      .from('reviews')
      .insert(toSnakeCase(data))
      .select()
      .single();

    if (error) throw new Error(error.message);
    return toCamelCase(review) as Review;
  }

  async getEventAttendees(eventId: string, currentUserId?: string): Promise<(User & { isFollowing: boolean })[]> {
    // 1. Get all approved/checked_in registrations for the event
    const { data: registrations, error: regError } = await supabase
      .from('registrations')
      .select('user_id, email, name')
      .eq('event_id', eventId)
      .in('status', ['approved', 'checked_in', 'checked_out']);

    if (regError) throw new Error(regError.message);
    if (!registrations || registrations.length === 0) return [];

    // 2. Get user details for these registrations
    const userIds = registrations.filter(r => r.user_id).map(r => r.user_id as string);
    if (userIds.length === 0) return [];

    const { data: usersData, error: userError } = await supabase
      .from('users')
      .select('*')
      .in('id', userIds);

    if (userError) throw new Error(userError.message);

    // 3. If currentUserId is provided, check follow status
    let followingIds: string[] = [];
    if (currentUserId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);
      if (followData) {
        followingIds = followData.map(f => f.following_id);
      }
    }

    return (usersData || []).map(u => {
      const user = toCamelCase(u) as User;
      return {
        ...user,
        isFollowing: followingIds.includes(u.id)
      };
    });
  }

  async searchEvents(params: {
    query?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ events: (Event & { registrationCount: number })[]; total: number }> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    let query = supabase
      .from('events')
      .select('*, registrationCount:registrations(count)', { count: 'exact' });

    if (params.query) {
      query = query.or(`title.ilike.%${params.query}%,description.ilike.%${params.query}%,location.ilike.%${params.query}%`);
    }

    if (params.category && params.category !== 'All') {
      query = query.eq('category', params.category);
    }

    if (params.startDate) {
      query = query.gte('start_date', params.startDate.toISOString());
    }

    if (params.endDate) {
      query = query.lte('start_date', params.endDate.toISOString());
    }

    const { data, error, count } = await query
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    return {
      events: (data || []).map((item: any) => ({
        ...toCamelCase(item),
        registrationCount: item.registrationCount?.[0]?.count || 0,
      })) as any,
      total: count || 0,
    };
  }
}

export const storage = new SupabaseStorage();
