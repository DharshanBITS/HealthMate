/**
 * Appointment Status Management System for Agentic Farm Advisory Platform
 * Manages Human-in-the-Loop workflow for agronomist reviews and field visits
 */

// ==================== TYPES & ENUMS ====================

enum AppointmentStatus {
  PENDING_REVIEW = 'pending_review',
  ASSIGNED = 'assigned',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FIELD_VISIT_SCHEDULED = 'field_visit_scheduled',
  FIELD_VISIT_COMPLETED = 'field_visit_completed',
  FARMER_NOTIFIED = 'farmer_notified',
  EXPIRED = 'expired'
}

enum Priority {
  CRITICAL = 1,  // < 2 hours
  HIGH = 2,      // < 4 hours
  MEDIUM = 3,    // < 24 hours
  LOW = 4        // < 48 hours
}

enum ReviewOutcome {
  APPROVED = 'approved',
  APPROVED_WITH_MODIFICATIONS = 'approved_with_modifications',
  REJECTED = 'rejected',
  REQUIRES_FIELD_VISIT = 'requires_field_visit'
}

interface Recommendation {
  id: string;
  farmerId: string;
  agentType: string;
  action: string;
  confidence: number;
  priority: Priority;
  context: any;
  createdAt: Date;
  escalationReason: string;
}

interface Agronomist {
  id: string;
  name: string;
  specialization: string[];
  maxConcurrentReviews: number;
  currentLoad: number;
  availability: { start: Date; end: Date }[];
  region: string;
}

interface Appointment {
  id: string;
  recommendationId: string;
  farmerId: string;
  agronomistId: string | null;
  status: AppointmentStatus;
  priority: Priority;
  createdAt: Date;
  assignedAt: Date | null;
  reviewStartedAt: Date | null;
  completedAt: Date | null;
  slaDeadline: Date;
  outcome: ReviewOutcome | null;
  agronomistNotes: string;
  modifiedRecommendation: string | null;
  fieldVisitScheduled: Date | null;
  notificationsSent: string[];
  statusHistory: StatusChange[];
}

interface StatusChange {
  from: AppointmentStatus;
  to: AppointmentStatus;
  timestamp: Date;
  actor: string;
  reason: string;
}

// ==================== SLA CALCULATOR ====================

class SLACalculator {
  private readonly SLA_HOURS: Record<Priority, number> = {
    [Priority.CRITICAL]: 2,
    [Priority.HIGH]: 4,
    [Priority.MEDIUM]: 24,
    [Priority.LOW]: 48
  };

  calculateDeadline(priority: Priority, createdAt: Date): Date {
    const hours = this.SLA_HOURS[priority];
    return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  }

  isBreached(deadline: Date): boolean {
    return new Date() > deadline;
  }

  getTimeRemaining(deadline: Date): string {
    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return 'BREACHED';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
}

// ==================== NOTIFICATION SERVICE ====================

class NotificationService {
  async notifyAgronomist(agronomist: Agronomist, appointment: Appointment): Promise<void> {
    console.log(`📧 [Notification] Email sent to ${agronomist.name}`);
    console.log(`   Subject: New High-Priority Review Assignment`);
    console.log(`   Deadline: ${appointment.slaDeadline.toLocaleString()}`);
    appointment.notificationsSent.push(`agronomist_assigned_${Date.now()}`);
  }

  async notifyFarmer(farmerId: string, status: AppointmentStatus, message: string): Promise<void> {
    console.log(`📱 [Notification] Push notification to Farmer ${farmerId}`);
    console.log(`   Status: ${status}`);
    console.log(`   Message: ${message}`);
  }

  async escalateSLABreach(appointment: Appointment): Promise<void> {
    console.log(`🚨 [ALERT] SLA Breach - Appointment ${appointment.id}`);
    console.log(`   Priority: ${Priority[appointment.priority]}`);
    console.log(`   Deadline was: ${appointment.slaDeadline.toLocaleString()}`);
  }

  async sendFieldVisitReminder(appointment: Appointment, agronomist: Agronomist): Promise<void> {
    console.log(`📅 [Reminder] Field visit tomorrow for ${agronomist.name}`);
    console.log(`   Farmer: ${appointment.farmerId}`);
    console.log(`   Scheduled: ${appointment.fieldVisitScheduled?.toLocaleString()}`);
  }
}

// ==================== AGRONOMIST SCHEDULER ====================

class AgronomistScheduler {
  private agronomists: Map<string, Agronomist> = new Map();

  constructor(agronomistList: Agronomist[]) {
    agronomistList.forEach(a => this.agronomists.set(a.id, a));
  }

  findBestAgronomist(recommendation: Recommendation, region: string): Agronomist | null {
    const candidates = Array.from(this.agronomists.values())
      .filter(a => 
        a.region === region &&
        a.currentLoad < a.maxConcurrentReviews &&
        this.hasSpecialization(a, recommendation.action)
      )
      .sort((a, b) => a.currentLoad - b.currentLoad);

    return candidates[0] || null;
  }

  private hasSpecialization(agronomist: Agronomist, action: string): boolean {
    // Simple keyword matching - in production, use more sophisticated logic
    if (agronomist.specialization.length === 0) return true;
    return agronomist.specialization.some(spec => 
      action.toLowerCase().includes(spec.toLowerCase()) ||
      spec.toLowerCase() === 'general'
    ) || true; // For demo, accept all if no exact match
  }

  assignAgronomist(agronomistId: string): void {
    const agronomist = this.agronomists.get(agronomistId);
    if (agronomist) {
      agronomist.currentLoad++;
    }
  }

  releaseAgronomist(agronomistId: string): void {
    const agronomist = this.agronomists.get(agronomistId);
    if (agronomist && agronomist.currentLoad > 0) {
      agronomist.currentLoad--;
    }
  }

  scheduleFieldVisit(agronomist: Agronomist, preferredDate: Date): Date {
    // Find next available slot
    const nextAvailable = agronomist.availability.find(slot => 
      slot.start >= preferredDate
    );
    return nextAvailable?.start || new Date(preferredDate.getTime() + 24 * 60 * 60 * 1000);
  }
}

// ==================== APPOINTMENT MANAGER ====================

class AppointmentStatusManager {
  private appointments: Map<string, Appointment> = new Map();
  private slaCalculator: SLACalculator;
  private scheduler: AgronomistScheduler;
  private notificationService: NotificationService;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(agronomists: Agronomist[]) {
    this.slaCalculator = new SLACalculator();
    this.scheduler = new AgronomistScheduler(agronomists);
    this.notificationService = new NotificationService();
  }

  async createAppointment(recommendation: Recommendation): Promise<Appointment> {
    const appointment: Appointment = {
      id: `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recommendationId: recommendation.id,
      farmerId: recommendation.farmerId,
      agronomistId: null,
      status: AppointmentStatus.PENDING_REVIEW,
      priority: recommendation.priority,
      createdAt: new Date(),
      assignedAt: null,
      reviewStartedAt: null,
      completedAt: null,
      slaDeadline: this.slaCalculator.calculateDeadline(recommendation.priority, new Date()),
      outcome: null,
      agronomistNotes: '',
      modifiedRecommendation: null,
      fieldVisitScheduled: null,
      notificationsSent: [],
      statusHistory: [{
        from: AppointmentStatus.PENDING_REVIEW,
        to: AppointmentStatus.PENDING_REVIEW,
        timestamp: new Date(),
        actor: 'system',
        reason: 'Appointment created for high-impact recommendation'
      }]
    };

    this.appointments.set(appointment.id, appointment);
    console.log(`✨ [Appointment] Created: ${appointment.id} (Priority: ${Priority[appointment.priority]})`);

    // Auto-assign agronomist
    await this.assignAgronomist(appointment.id, recommendation.context.region || 'default', recommendation.action);

    return appointment;
  }

  async assignAgronomist(appointmentId: string, region: string, action: string = ''): Promise<boolean> {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) return false;

    const recommendation = { 
      action: action || appointment.recommendationId,
      farmerId: appointment.farmerId,
      priority: appointment.priority,
      context: {}
    } as Recommendation;

    const agronomist = this.scheduler.findBestAgronomist(recommendation, region);
    
    if (!agronomist) {
      console.log(`⚠️  [Warning] No available agronomist for ${appointmentId}`);
      return false;
    }

    appointment.agronomistId = agronomist.id;
    appointment.assignedAt = new Date();
    this.updateStatus(appointment, AppointmentStatus.ASSIGNED, 'system', 
      `Assigned to ${agronomist.name}`);

    this.scheduler.assignAgronomist(agronomist.id);
    await this.notificationService.notifyAgronomist(agronomist, appointment);

    console.log(`👤 [Assignment] ${agronomist.name} assigned to ${appointmentId}`);
    return true;
  }

  async startReview(appointmentId: string, agronomistId: string): Promise<boolean> {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment || appointment.agronomistId !== agronomistId) return false;

    appointment.reviewStartedAt = new Date();
    this.updateStatus(appointment, AppointmentStatus.IN_REVIEW, agronomistId, 
      'Agronomist started review');

    await this.notificationService.notifyFarmer(
      appointment.farmerId,
      AppointmentStatus.IN_REVIEW,
      'Your recommendation is being reviewed by an expert'
    );

    console.log(`🔍 [Review] Started for ${appointmentId}`);
    return true;
  }

  async completeReview(
    appointmentId: string,
    agronomistId: string,
    outcome: ReviewOutcome,
    notes: string,
    modifiedRecommendation?: string
  ): Promise<boolean> {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment || appointment.agronomistId !== agronomistId) return false;

    appointment.completedAt = new Date();
    appointment.outcome = outcome;
    appointment.agronomistNotes = notes;
    appointment.modifiedRecommendation = modifiedRecommendation || null;

    // Determine final status
    let finalStatus: AppointmentStatus;
    let farmerMessage: string;

    switch (outcome) {
      case ReviewOutcome.APPROVED:
        finalStatus = AppointmentStatus.APPROVED;
        farmerMessage = 'Your recommendation has been approved by an agronomist';
        break;
      case ReviewOutcome.APPROVED_WITH_MODIFICATIONS:
        finalStatus = AppointmentStatus.APPROVED;
        farmerMessage = 'Your recommendation has been approved with modifications';
        break;
      case ReviewOutcome.REJECTED:
        finalStatus = AppointmentStatus.REJECTED;
        farmerMessage = 'Your recommendation was not approved. Please see agronomist notes.';
        break;
      case ReviewOutcome.REQUIRES_FIELD_VISIT:
        finalStatus = AppointmentStatus.FIELD_VISIT_SCHEDULED;
        farmerMessage = 'A field visit has been scheduled for further assessment';
        break;
    }

    this.updateStatus(appointment, finalStatus, agronomistId, notes);

    // Schedule field visit if needed
    if (outcome === ReviewOutcome.REQUIRES_FIELD_VISIT) {
      await this.scheduleFieldVisit(appointmentId, agronomistId);
    }

    // Release agronomist capacity
    this.scheduler.releaseAgronomist(agronomistId);

    // Notify farmer
    await this.notificationService.notifyFarmer(
      appointment.farmerId,
      finalStatus,
      farmerMessage
    );

    this.updateStatus(appointment, AppointmentStatus.FARMER_NOTIFIED, 'system', 
      'Farmer notified of review outcome');

    console.log(`✅ [Review] Completed for ${appointmentId} - Outcome: ${outcome}`);
    return true;
  }

  async scheduleFieldVisit(appointmentId: string, agronomistId: string): Promise<Date | null> {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment) return null;

    const agronomist = Array.from(this.scheduler['agronomists'].values())
      .find(a => a.id === agronomistId);
    
    if (!agronomist) return null;

    const preferredDate = new Date(Date.now() + 48 * 60 * 60 * 1000); // 2 days from now
    const scheduledDate = this.scheduler.scheduleFieldVisit(agronomist, preferredDate);

    appointment.fieldVisitScheduled = scheduledDate;
    this.updateStatus(appointment, AppointmentStatus.FIELD_VISIT_SCHEDULED, 
      agronomistId, `Field visit scheduled for ${scheduledDate.toLocaleString()}`);

    console.log(`📅 [Field Visit] Scheduled for ${appointmentId} on ${scheduledDate.toLocaleString()}`);
    return scheduledDate;
  }

  async completeFieldVisit(
    appointmentId: string,
    agronomistId: string,
    finalNotes: string
  ): Promise<boolean> {
    const appointment = this.appointments.get(appointmentId);
    if (!appointment || appointment.agronomistId !== agronomistId) return false;

    appointment.agronomistNotes += `\n\nField Visit Notes:\n${finalNotes}`;
    this.updateStatus(appointment, AppointmentStatus.FIELD_VISIT_COMPLETED, 
      agronomistId, 'Field visit completed');

    await this.notificationService.notifyFarmer(
      appointment.farmerId,
      AppointmentStatus.FIELD_VISIT_COMPLETED,
      'Field visit completed. Updated recommendations available.'
    );

    console.log(`✅ [Field Visit] Completed for ${appointmentId}`);
    return true;
  }

  private updateStatus(
    appointment: Appointment,
    newStatus: AppointmentStatus,
    actor: string,
    reason: string
  ): void {
    const oldStatus = appointment.status;
    appointment.status = newStatus;
    appointment.statusHistory.push({
      from: oldStatus,
      to: newStatus,
      timestamp: new Date(),
      actor,
      reason
    });
  }

  getAppointment(appointmentId: string): Appointment | undefined {
    return this.appointments.get(appointmentId);
  }

  getAppointmentsByStatus(status: AppointmentStatus): Appointment[] {
    return Array.from(this.appointments.values())
      .filter(a => a.status === status);
  }

  getPendingReviewsForAgronomist(agronomistId: string): Appointment[] {
    return Array.from(this.appointments.values())
      .filter(a => 
        a.agronomistId === agronomistId && 
        (a.status === AppointmentStatus.ASSIGNED || a.status === AppointmentStatus.IN_REVIEW)
      );
  }

  startSLAMonitoring(checkIntervalMs: number = 60000): void {
    this.checkInterval = setInterval(() => this.checkSLABreaches(), checkIntervalMs);
    console.log('⏰ [SLA Monitor] Started');
  }

  stopSLAMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      console.log('⏰ [SLA Monitor] Stopped');
    }
  }

  private async checkSLABreaches(): Promise<void> {
    const now = new Date();
    for (const appointment of this.appointments.values()) {
      if (
        appointment.status !== AppointmentStatus.APPROVED &&
        appointment.status !== AppointmentStatus.REJECTED &&
        appointment.status !== AppointmentStatus.FARMER_NOTIFIED &&
        this.slaCalculator.isBreached(appointment.slaDeadline)
      ) {
        await this.notificationService.escalateSLABreach(appointment);
        this.updateStatus(appointment, AppointmentStatus.EXPIRED, 'system', 
          'SLA deadline breached');
      }
    }
  }

  getMetrics(): any {
    const appointments = Array.from(this.appointments.values());
    return {
      total: appointments.length,
      byStatus: {
        pending: appointments.filter(a => a.status === AppointmentStatus.PENDING_REVIEW).length,
        assigned: appointments.filter(a => a.status === AppointmentStatus.ASSIGNED).length,
        inReview: appointments.filter(a => a.status === AppointmentStatus.IN_REVIEW).length,
        approved: appointments.filter(a => a.status === AppointmentStatus.APPROVED).length,
        rejected: appointments.filter(a => a.status === AppointmentStatus.REJECTED).length,
      },
      avgReviewTime: this.calculateAvgReviewTime(appointments),
      slaCompliance: this.calculateSLACompliance(appointments)
    };
  }

  private calculateAvgReviewTime(appointments: Appointment[]): number {
    const completed = appointments.filter(a => a.completedAt && a.assignedAt);
    if (completed.length === 0) return 0;
    
    const totalMs = completed.reduce((sum, a) => 
      sum + (a.completedAt!.getTime() - a.assignedAt!.getTime()), 0);
    return Math.round(totalMs / completed.length / (1000 * 60)); // minutes
  }

  private calculateSLACompliance(appointments: Appointment[]): number {
    const completed = appointments.filter(a => a.completedAt);
    if (completed.length === 0) return 100;
    
    const compliant = completed.filter(a => 
      a.completedAt!.getTime() <= a.slaDeadline.getTime()
    );
    return Math.round((compliant.length / completed.length) * 100);
  }
}

// ==================== EXAMPLE USAGE ====================

async function demonstrateAppointmentManagement() {
  // Initialize agronomists
  const agronomists: Agronomist[] = [
    {
      id: 'AGR-001',
      name: 'Dr. Rajesh Kumar',
      specialization: ['irrigation', 'pest', 'soil'],
      maxConcurrentReviews: 5,
      currentLoad: 0,
      availability: [
        { start: new Date(Date.now() + 48 * 60 * 60 * 1000), end: new Date(Date.now() + 72 * 60 * 60 * 1000) }
      ],
      region: 'north-india'
    },
    {
      id: 'AGR-002',
      name: 'Dr. Priya Sharma',
      specialization: ['crop', 'fertilizer', 'disease'],
      maxConcurrentReviews: 3,
      currentLoad: 0,
      availability: [
        { start: new Date(Date.now() + 24 * 60 * 60 * 1000), end: new Date(Date.now() + 48 * 60 * 60 * 1000) }
      ],
      region: 'north-india'
    }
  ];

  const manager = new AppointmentStatusManager(agronomists);
  manager.startSLAMonitoring(5000); // Check every 5 seconds for demo

  // Scenario 1: High-priority irrigation recommendation
  console.log('\n=== Scenario 1: High-Priority Irrigation Review ===');
  const rec1: Recommendation = {
    id: 'REC-001',
    farmerId: 'FARMER-123',
    agentType: 'advisory',
    action: 'irrigate-heavy',
    confidence: 65,
    priority: Priority.HIGH,
    context: { region: 'north-india', soilMoisture: 10 },
    createdAt: new Date(),
    escalationReason: 'Low confidence on water-intensive action'
  };

  const apt1 = await manager.createAppointment(rec1);
  console.log(`   SLA Deadline: ${apt1.slaDeadline.toLocaleString()}`);
  
  // Simulate review process
  await new Promise(resolve => setTimeout(resolve, 1000));
  await manager.startReview(apt1.id, 'AGR-001');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await manager.completeReview(
    apt1.id,
    'AGR-001',
    ReviewOutcome.APPROVED_WITH_MODIFICATIONS,
    'Approved with reduced water volume. Soil moisture adequate for moderate irrigation.',
    'irrigate-moderate'
  );

  // Scenario 2: Critical pest control requiring field visit
  console.log('\n=== Scenario 2: Critical Pest Control - Field Visit Required ===');
  const rec2: Recommendation = {
    id: 'REC-002',
    farmerId: 'FARMER-456',
    agentType: 'diagnostics',
    action: 'apply-pesticide',
    confidence: 55,
    priority: Priority.CRITICAL,
    context: { region: 'north-india', pestType: 'unknown' },
    createdAt: new Date(),
    escalationReason: 'Unknown pest type detected, low confidence'
  };

  const apt2 = await manager.createAppointment(rec2);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  await manager.startReview(apt2.id, 'AGR-001');
  
  await new Promise(resolve => setTimeout(resolve, 1500));
  await manager.completeReview(
    apt2.id,
    'AGR-001',
    ReviewOutcome.REQUIRES_FIELD_VISIT,
    'Need physical inspection to identify pest species before recommending treatment'
  );

  await new Promise(resolve => setTimeout(resolve, 1000));
  await manager.completeFieldVisit(
    apt2.id,
    'AGR-001',
    'Identified as aphids. Recommended organic neem oil treatment instead of chemical pesticide.'
  );

  // Scenario 3: Rejected recommendation
  console.log('\n=== Scenario 3: Rejected Recommendation ===');
  const rec3: Recommendation = {
    id: 'REC-003',
    farmerId: 'FARMER-789',
    agentType: 'planner',
    action: 'change-crop-type',
    confidence: 45,
    priority: Priority.MEDIUM,
    context: { region: 'north-india', currentCrop: 'wheat' },
    createdAt: new Date(),
    escalationReason: 'Major decision with low confidence'
  };

  const apt3 = await manager.createAppointment(rec3);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  await manager.startReview(apt3.id, 'AGR-002');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  await manager.completeReview(
    apt3.id,
    'AGR-002',
    ReviewOutcome.REJECTED,
    'Current crop is suitable for season and soil. Changing crop type not recommended at this stage.'
  );

  // Display metrics
  console.log('\n=== System Metrics ===');
  const metrics = manager.getMetrics();
  console.log(`Total Appointments: ${metrics.total}`);
  console.log(`Approved: ${metrics.byStatus.approved}`);
  console.log(`Rejected: ${metrics.byStatus.rejected}`);
  console.log(`Average Review Time: ${metrics.avgReviewTime} minutes`);
  console.log(`SLA Compliance: ${metrics.slaCompliance}%`);

  manager.stopSLAMonitoring();
}

// Run demonstration
demonstrateAppointmentManagement();
