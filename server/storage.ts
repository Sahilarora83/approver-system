import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  events,
  registrations,
  checkIns,
  formTemplates,
  type User,
  type Event,
  type Registration,
  type CheckIn,
  type FormTemplate,
  type InsertUser,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getEvents(organizerId: string): Promise<(Event & { registrationCount: number })[]>;
  getEvent(id: string): Promise<Event | undefined>;
  getEventByPublicLink(link: string): Promise<Event | undefined>;
  createEvent(event: Omit<Event, "id" | "createdAt" | "publicLink">): Promise<Event>;
  updateEvent(id: string, data: Partial<Event>): Promise<Event | undefined>;

  getRegistrations(eventId: string): Promise<Registration[]>;
  getRegistration(id: string): Promise<(Registration & { event: Event }) | undefined>;
  getRegistrationByQR(qrCode: string): Promise<(Registration & { event: Event }) | undefined>;
  getUserRegistrations(userId: string): Promise<(Registration & { event: Event })[]>;
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
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getEvents(organizerId: string): Promise<(Event & { registrationCount: number })[]> {
    const result = await db
      .select({
        event: events,
        registrationCount: sql<number>`cast(count(${registrations.id}) as int)`,
      })
      .from(events)
      .leftJoin(registrations, eq(events.id, registrations.eventId))
      .where(eq(events.organizerId, organizerId))
      .groupBy(events.id)
      .orderBy(desc(events.createdAt));

    return result.map((r) => ({
      ...r.event,
      registrationCount: r.registrationCount || 0,
    }));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    return event;
  }

  async getEventByPublicLink(link: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.publicLink, link)).limit(1);
    return event;
  }

  async createEvent(data: Omit<Event, "id" | "createdAt" | "publicLink">): Promise<Event> {
    const publicLink = randomUUID().slice(0, 8);
    const [event] = await db
      .insert(events)
      .values({ ...data, publicLink })
      .returning();
    return event;
  }

  async updateEvent(id: string, data: Partial<Event>): Promise<Event | undefined> {
    const [event] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return event;
  }

  async getRegistrations(eventId: string): Promise<Registration[]> {
    return db
      .select()
      .from(registrations)
      .where(eq(registrations.eventId, eventId))
      .orderBy(desc(registrations.createdAt));
  }

  async getRegistration(id: string): Promise<(Registration & { event: Event }) | undefined> {
    const [result] = await db
      .select({
        registration: registrations,
        event: events,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(eq(registrations.id, id))
      .limit(1);

    if (!result) return undefined;
    return { ...result.registration, event: result.event };
  }

  async getRegistrationByQR(qrCode: string): Promise<(Registration & { event: Event }) | undefined> {
    const [result] = await db
      .select({
        registration: registrations,
        event: events,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(eq(registrations.qrCode, qrCode))
      .limit(1);

    if (!result) return undefined;
    return { ...result.registration, event: result.event };
  }

  async getUserRegistrations(userId: string): Promise<(Registration & { event: Event })[]> {
    const result = await db
      .select({
        registration: registrations,
        event: events,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(eq(registrations.userId, userId))
      .orderBy(desc(registrations.createdAt));

    return result.map((r) => ({ ...r.registration, event: r.event }));
  }

  async getUserRegistrationsByEmail(email: string): Promise<(Registration & { event: Event })[]> {
    const result = await db
      .select({
        registration: registrations,
        event: events,
      })
      .from(registrations)
      .innerJoin(events, eq(registrations.eventId, events.id))
      .where(eq(registrations.email, email))
      .orderBy(desc(registrations.createdAt));

    return result.map((r) => ({ ...r.registration, event: r.event }));
  }

  async createRegistration(
    data: Omit<Registration, "id" | "createdAt" | "qrCode" | "ticketLink">
  ): Promise<Registration> {
    const qrCode = `QR-${randomUUID()}`;
    const ticketLink = `ticket-${randomUUID().slice(0, 12)}`;
    const [registration] = await db
      .insert(registrations)
      .values({ ...data, qrCode, ticketLink })
      .returning();
    return registration;
  }

  async updateRegistrationStatus(id: string, status: string): Promise<Registration | undefined> {
    const [registration] = await db
      .update(registrations)
      .set({ status })
      .where(eq(registrations.id, id))
      .returning();
    return registration;
  }

  async createCheckIn(data: Omit<CheckIn, "id" | "timestamp">): Promise<CheckIn> {
    const [checkIn] = await db.insert(checkIns).values(data).returning();
    return checkIn;
  }

  async getCheckIns(registrationId: string): Promise<CheckIn[]> {
    return db
      .select()
      .from(checkIns)
      .where(eq(checkIns.registrationId, registrationId))
      .orderBy(desc(checkIns.timestamp));
  }

  async getAdminStats(organizerId: string): Promise<{
    totalEvents: number;
    totalRegistrations: number;
    totalCheckedIn: number;
    totalPending: number;
  }> {
    const [eventsCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(events)
      .where(eq(events.organizerId, organizerId));

    const organizerEvents = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.organizerId, organizerId));

    const eventIds = organizerEvents.map((e) => e.id);

    if (eventIds.length === 0) {
      return {
        totalEvents: 0,
        totalRegistrations: 0,
        totalCheckedIn: 0,
        totalPending: 0,
      };
    }

    const [regsStats] = await db
      .select({
        total: sql<number>`cast(count(*) as int)`,
        checkedIn: sql<number>`cast(count(case when ${registrations.status} = 'checked_in' then 1 end) as int)`,
        pending: sql<number>`cast(count(case when ${registrations.status} = 'pending' then 1 end) as int)`,
      })
      .from(registrations)
      .where(inArray(registrations.eventId, eventIds));

    return {
      totalEvents: eventsCount?.count || 0,
      totalRegistrations: regsStats?.total || 0,
      totalCheckedIn: regsStats?.checkedIn || 0,
      totalPending: regsStats?.pending || 0,
    };
  }
}

export const storage = new DatabaseStorage();
