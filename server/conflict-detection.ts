/**
 * Conflict Detection & Prevention System for Agentic Farm Advisory Platform
 * Ensures multiple AI agents don't provide conflicting recommendations
 */

// ==================== TYPES & INTERFACES ====================

interface AgentRecommendation {
  agentId: string;
  agentType: 'advisory' | 'diagnostics' | 'planner';
  farmerId: string;
  action: string;
  confidence: number; // 0-100
  priority: number; // 1-5 (5 = highest)
  timestamp: Date;
  context: {
    soilMoisture?: number;
    pestDetected?: string;
    weatherForecast?: string;
    cropType?: string;
    [key: string]: any;
  };
  dependencies?: string[]; // Actions this depends on
  conflicts?: string[]; // Actions this conflicts with
}

interface ConflictRule {
  action1: string;
  action2: string;
  severity: 'high' | 'medium' | 'low';
  resolution: 'priority' | 'confidence' | 'timestamp' | 'escalate';
}

interface SharedContext {
  farmerId: string;
  activeRecommendations: AgentRecommendation[];
  recentActions: string[];
  lastUpdate: Date;
}

// ==================== CONFLICT RULES ====================

const CONFLICT_RULES: ConflictRule[] = [
  { action1: 'irrigate', action2: 'dont_irrigate', severity: 'high', resolution: 'confidence' },
  { action1: 'apply_pesticide', action2: 'dont_apply_pesticide', severity: 'high', resolution: 'escalate' },
  { action1: 'harvest', action2: 'fertilize', severity: 'high', resolution: 'priority' },
  { action1: 'plant_crop_a', action2: 'plant_crop_b', severity: 'medium', resolution: 'confidence' },
  { action1: 'irrigate', action2: 'apply_fertilizer', severity: 'low', resolution: 'timestamp' },
];

// ==================== CONTEXT MANAGER ====================

class ContextManager {
  private contexts: Map<string, SharedContext> = new Map();
  private readonly TTL_HOURS = 24;

  getContext(farmerId: string): SharedContext {
    const context = this.contexts.get(farmerId);
    if (!context || this.isExpired(context)) {
      return this.createContext(farmerId);
    }
    return context;
  }

  updateContext(farmerId: string, recommendation: AgentRecommendation): void {
    const context = this.getContext(farmerId);
    context.activeRecommendations.push(recommendation);
    context.lastUpdate = new Date();
    this.contexts.set(farmerId, context);
    this.compressContext(farmerId); // Prevent overflow
  }

  private createContext(farmerId: string): SharedContext {
    const context: SharedContext = {
      farmerId,
      activeRecommendations: [],
      recentActions: [],
      lastUpdate: new Date()
    };
    this.contexts.set(farmerId, context);
    return context;
  }

  private isExpired(context: SharedContext): boolean {
    const hours = (Date.now() - context.lastUpdate.getTime()) / (1000 * 60 * 60);
    return hours > this.TTL_HOURS;
  }

  private compressContext(farmerId: string): void {
    const context = this.getContext(farmerId);
    // Keep only last 10 recommendations
    if (context.activeRecommendations.length > 10) {
      context.activeRecommendations = context.activeRecommendations
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);
    }
  }

  clearRecommendation(farmerId: string, recommendationId: string): void {
    const context = this.getContext(farmerId);
    context.activeRecommendations = context.activeRecommendations
      .filter(r => `${r.agentId}-${r.timestamp.getTime()}` !== recommendationId);
  }
}

// ==================== CONFLICT DETECTOR ====================

class ConflictDetector {
  private rules: ConflictRule[];

  constructor(rules: ConflictRule[]) {
    this.rules = rules;
  }

  detectConflicts(
    newRec: AgentRecommendation,
    existingRecs: AgentRecommendation[]
  ): { conflicting: AgentRecommendation; rule: ConflictRule }[] {
    const conflicts: { conflicting: AgentRecommendation; rule: ConflictRule }[] = [];

    for (const existing of existingRecs) {
      // Skip same agent's recommendations
      if (existing.agentId === newRec.agentId) continue;

      // Check rule-based conflicts
      const rule = this.findConflictRule(newRec.action, existing.action);
      if (rule) {
        conflicts.push({ conflicting: existing, rule });
        continue;
      }

      // Check explicit conflicts
      if (newRec.conflicts?.includes(existing.action)) {
        conflicts.push({
          conflicting: existing,
          rule: { action1: newRec.action, action2: existing.action, severity: 'high', resolution: 'escalate' }
        });
      }

      // Check dependency conflicts
      if (this.hasDependencyConflict(newRec, existing)) {
        conflicts.push({
          conflicting: existing,
          rule: { action1: newRec.action, action2: existing.action, severity: 'medium', resolution: 'priority' }
        });
      }
    }

    return conflicts;
  }

  private findConflictRule(action1: string, action2: string): ConflictRule | null {
    return this.rules.find(rule =>
      (rule.action1 === action1 && rule.action2 === action2) ||
      (rule.action1 === action2 && rule.action2 === action1)
    ) || null;
  }

  private hasDependencyConflict(rec1: AgentRecommendation, rec2: AgentRecommendation): boolean {
    if (!rec1.dependencies) return false;
    return rec1.dependencies.some(dep => rec2.action === dep);
  }
}

// ==================== CONFLICT RESOLVER ====================

class ConflictResolver {
  resolve(
    newRec: AgentRecommendation,
    conflicts: { conflicting: AgentRecommendation; rule: ConflictRule }[]
  ): { decision: 'accept' | 'reject' | 'escalate'; reason: string; winner?: AgentRecommendation } {
    
    if (conflicts.length === 0) {
      return { decision: 'accept', reason: 'No conflicts detected' };
    }

    // High severity always escalates
    const highSevConflicts = conflicts.filter(c => c.rule.severity === 'high');
    if (highSevConflicts.length > 0) {
      return {
        decision: 'escalate',
        reason: `High severity conflict detected: ${highSevConflicts.map(c => c.rule.action2).join(', ')}`,
      };
    }

    // Resolve based on strategy
    for (const { conflicting, rule } of conflicts) {
      const resolution = this.resolveByStrategy(newRec, conflicting, rule);
      if (resolution.decision !== 'accept') {
        return resolution;
      }
    }

    return { decision: 'accept', reason: 'All conflicts resolved in favor of new recommendation' };
  }

  private resolveByStrategy(
    newRec: AgentRecommendation,
    existing: AgentRecommendation,
    rule: ConflictRule
  ): { decision: 'accept' | 'reject' | 'escalate'; reason: string; winner?: AgentRecommendation } {
    
    switch (rule.resolution) {
      case 'priority':
        if (newRec.priority > existing.priority) {
          return { decision: 'accept', reason: 'Higher priority', winner: newRec };
        } else {
          return { decision: 'reject', reason: 'Lower priority', winner: existing };
        }

      case 'confidence':
        if (newRec.confidence > existing.confidence) {
          return { decision: 'accept', reason: 'Higher confidence', winner: newRec };
        } else {
          return { decision: 'reject', reason: 'Lower confidence', winner: existing };
        }

      case 'timestamp':
        if (newRec.timestamp > existing.timestamp) {
          return { decision: 'accept', reason: 'More recent recommendation', winner: newRec };
        } else {
          return { decision: 'reject', reason: 'Older recommendation', winner: existing };
        }

      case 'escalate':
        return {
          decision: 'escalate',
          reason: `Conflict requires human review: ${newRec.action} vs ${existing.action}`
        };

      default:
        return { decision: 'escalate', reason: 'Unknown resolution strategy' };
    }
  }
}

// ==================== COORDINATOR AGENT ====================

class CoordinatorAgent {
  private contextManager: ContextManager;
  private conflictDetector: ConflictDetector;
  private conflictResolver: ConflictResolver;

  constructor() {
    this.contextManager = new ContextManager();
    this.conflictDetector = new ConflictDetector(CONFLICT_RULES);
    this.conflictResolver = new ConflictResolver();
  }

  async processRecommendation(recommendation: AgentRecommendation): Promise<{
    approved: boolean;
    escalated: boolean;
    reason: string;
    conflictsWith?: AgentRecommendation[];
  }> {
    
    // Get shared context
    const context = this.contextManager.getContext(recommendation.farmerId);
    
    // Detect conflicts
    const conflicts = this.conflictDetector.detectConflicts(
      recommendation,
      context.activeRecommendations
    );

    console.log(`[Coordinator] Detected ${conflicts.length} conflicts for ${recommendation.action}`);

    // Resolve conflicts
    const resolution = this.conflictResolver.resolve(recommendation, conflicts);

    // Handle resolution
    switch (resolution.decision) {
      case 'accept':
        this.contextManager.updateContext(recommendation.farmerId, recommendation);
        console.log(`[Coordinator] ✓ Approved: ${recommendation.action} (${resolution.reason})`);
        return { approved: true, escalated: false, reason: resolution.reason };

      case 'reject':
        console.log(`[Coordinator] ✗ Rejected: ${recommendation.action} (${resolution.reason})`);
        return {
          approved: false,
          escalated: false,
          reason: resolution.reason,
          conflictsWith: conflicts.map(c => c.conflicting)
        };

      case 'escalate':
        await this.escalateToHuman(recommendation, conflicts);
        console.log(`[Coordinator] ⚠ Escalated: ${recommendation.action} (${resolution.reason})`);
        return {
          approved: false,
          escalated: true,
          reason: resolution.reason,
          conflictsWith: conflicts.map(c => c.conflicting)
        };
    }
  }

  private async escalateToHuman(
    recommendation: AgentRecommendation,
    conflicts: { conflicting: AgentRecommendation; rule: ConflictRule }[]
  ): Promise<void> {
    // In production: Send to agronomist dashboard
    console.log(`\n[ESCALATION REQUIRED]`);
    console.log(`Farmer: ${recommendation.farmerId}`);
    console.log(`New Recommendation: ${recommendation.action} (Confidence: ${recommendation.confidence}%)`);
    console.log(`Conflicts with:`);
    conflicts.forEach(c => {
      console.log(`  - ${c.conflicting.action} from ${c.conflicting.agentType} agent (Severity: ${c.rule.severity})`);
    });
    console.log(`Agronomist review required.\n`);
  }
}

// ==================== EXAMPLE USAGE ====================

async function demonstrateConflictDetection() {
  const coordinator = new CoordinatorAgent();

  // Recommendation 1: Advisory Agent suggests irrigation
  const rec1: AgentRecommendation = {
    agentId: 'advisory-001',
    agentType: 'advisory',
    farmerId: 'farmer-123',
    action: 'irrigate',
    confidence: 85,
    priority: 4,
    timestamp: new Date(),
    context: { soilMoisture: 15, cropType: 'wheat' }
  };

  console.log('\n=== Test 1: First recommendation ===');
  await coordinator.processRecommendation(rec1);

  // Recommendation 2: Diagnostics Agent suggests no irrigation (CONFLICT!)
  const rec2: AgentRecommendation = {
    agentId: 'diagnostics-001',
    agentType: 'diagnostics',
    farmerId: 'farmer-123',
    action: 'dont_irrigate',
    confidence: 90,
    priority: 5,
    timestamp: new Date(Date.now() + 1000),
    context: { pestDetected: 'fungal-disease', weatherForecast: 'heavy-rain' }
  };

  console.log('\n=== Test 2: Conflicting recommendation (higher confidence) ===');
  await coordinator.processRecommendation(rec2);

  // Recommendation 3: Planner suggests pesticide (ESCALATION!)
  const rec3: AgentRecommendation = {
    agentId: 'planner-001',
    agentType: 'planner',
    farmerId: 'farmer-123',
    action: 'apply_pesticide',
    confidence: 75,
    priority: 5,
    timestamp: new Date(Date.now() + 2000),
    context: { pestDetected: 'aphids' }
  };

  console.log('\n=== Test 3: High-severity conflict (escalation) ===');
  await coordinator.processRecommendation(rec3);

  // Recommendation 4: Compatible action
  const rec4: AgentRecommendation = {
    agentId: 'advisory-002',
    agentType: 'advisory',
    farmerId: 'farmer-123',
    action: 'check_sensor_readings',
    confidence: 95,
    priority: 2,
    timestamp: new Date(Date.now() + 3000),
    context: {}
  };

  console.log('\n=== Test 4: No conflict ===');
  await coordinator.processRecommendation(rec4);
}

// Run demonstration
demonstrateConflictDetection();
