const mongoose = require('mongoose');

// ─── Interview Candidate ──────────────────────────────────────────────────────
// Created ONLY by Instructors. No self-registration allowed.
const InterviewCandidateSchema = new mongoose.Schema({
    // Login credentials
    username: { type: String, required: true, unique: true, trim: true },
    password_hash: { type: String, required: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    mobile_number: { type: String, required: true },
    full_name: { type: String, required: true },

    // Who created this candidate account
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Assigned exam details
    assigned_exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewExamSchedule' },
    exam_schedule: {
        date: { type: String },             // YYYY-MM-DD
        time: { type: String },             // HH:MM (24h)
        duration_minutes: { type: Number }, // exam duration in minutes
    },

    // Account status
    status: {
        type: String,
        enum: ['active', 'blocked', 'completed'],
        default: 'active'
    },

    // Login tracking
    last_login_at: { type: Date },
    last_login_ip: { type: String },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { collection: 'interview_candidates' });

InterviewCandidateSchema.index({ username: 1 });
InterviewCandidateSchema.index({ email: 1 });
InterviewCandidateSchema.index({ assigned_exam_id: 1 });
InterviewCandidateSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password_hash; // Never send password hash to client
    }
});

// ─── Interview Exam Schedule (Master Exam Definition) ────────────────────────
const InterviewExamScheduleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    num_questions: { type: Number, required: true, min: 1 },
    duration_minutes: { type: Number, required: true, min: 1 },
    passing_percentage: { type: Number, required: true, default: 50 },
    scheduled_date: { type: String, required: true },  // YYYY-MM-DD
    scheduled_time: { type: String, required: true },  // HH:MM

    // Anti-cheat config
    anti_cheat: {
        max_tab_switches: { type: Number, default: 3 },
        action_on_max_violations: { type: String, enum: ['submit', 'block'], default: 'submit' },
        enforce_fullscreen: { type: Boolean, default: true },
        disable_copy_paste: { type: Boolean, default: true },
        capture_screenshots: { type: Boolean, default: true }
    },

    // Who created this exam
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { collection: 'interview_exam_schedules' });

InterviewExamScheduleSchema.index({ created_by: 1 });
InterviewExamScheduleSchema.index({ scheduled_date: 1 });
InterviewExamScheduleSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Interview Question ───────────────────────────────────────────────────────
const InterviewQuestionSchema = new mongoose.Schema({
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewExamSchedule', required: true, index: true },
    question_text: { type: String, required: true },
    options: [{
        text: { type: String, required: true },
        is_correct: { type: Boolean, default: false }
    }],
    correct_answer: { type: String },       // Text of correct answer
    explanation: { type: String },          // AI-generated explanation
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
    marks: { type: Number, default: 1 },
    source: { type: String, enum: ['ai', 'manual'], default: 'ai' },
    order_index: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
}, { collection: 'interview_questions' });

InterviewQuestionSchema.index({ exam_id: 1, order_index: 1 });
InterviewQuestionSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Candidate Assignment (which candidates are assigned to which exam) ───────
const InterviewAssignmentSchema = new mongoose.Schema({
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewExamSchedule', required: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewCandidate', required: true },
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assigned_at: { type: Date, default: Date.now },
    // Override schedule per candidate (optional)
    scheduled_date: { type: String },
    scheduled_time: { type: String },
    duration_minutes: { type: Number }
}, { collection: 'interview_assignments' });

InterviewAssignmentSchema.index({ exam_id: 1, candidate_id: 1 }, { unique: true });
InterviewAssignmentSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Exam Attempt (when candidate actually starts+submits exam) ───────────────
const InterviewAttemptSchema = new mongoose.Schema({
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewExamSchedule', required: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewCandidate', required: true },

    status: {
        type: String,
        enum: ['in_progress', 'submitted', 'auto_submitted', 'blocked', 'force_submitted'],
        default: 'in_progress'
    },

    started_at: { type: Date, default: Date.now },
    submitted_at: { type: Date },
    time_taken_seconds: { type: Number },

    // Auto-saved answers map: { question_id: selected_option_id }
    answers: { type: Map, of: String, default: {} },

    // Evaluation results (filled on submission)
    total_questions: { type: Number, default: 0 },
    correct_answers: { type: Number, default: 0 },
    wrong_answers: { type: Number, default: 0 },
    unanswered: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean },

    // Anti-cheat stats (snapshot at submission)
    tab_switch_count: { type: Number, default: 0 },
    fullscreen_violation_count: { type: Number, default: 0 },
    screenshot_count: { type: Number, default: 0 },

    // Snapshot of questions for review
    questions_snapshot: [{
        question_id: mongoose.Schema.Types.ObjectId,
        question_text: String,
        options: [{ text: String, is_correct: Boolean }],
        correct_answer: String,
        student_answer: String,
        is_correct: Boolean,
        marks: Number
    }],

    // Admin controls
    paused_at: { type: Date },
    paused_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    force_submitted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    created_at: { type: Date, default: Date.now }
}, { collection: 'interview_attempts' });

InterviewAttemptSchema.index({ exam_id: 1, candidate_id: 1 });
InterviewAttemptSchema.index({ candidate_id: 1, status: 1 });
InterviewAttemptSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Violation Log ────────────────────────────────────────────────────────────
const InterviewViolationSchema = new mongoose.Schema({
    attempt_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewAttempt', required: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewCandidate', required: true },
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewExamSchedule', required: true },
    violation_type: {
        type: String,
        enum: ['tab_switch', 'window_blur', 'fullscreen_exit', 'copy_attempt', 'paste_attempt', 'right_click', 'devtools'],
        required: true
    },
    warning_number: { type: Number, default: 1 },   // 1, 2, 3 → 3 triggers auto-action
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Object }  // extra info about the violation
}, { collection: 'interview_violations' });

InterviewViolationSchema.index({ attempt_id: 1, violation_type: 1 });
InterviewViolationSchema.index({ candidate_id: 1 });
InterviewViolationSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Screenshot Evidence ──────────────────────────────────────────────────────
const InterviewScreenshotSchema = new mongoose.Schema({
    attempt_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewAttempt', required: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewCandidate', required: true },
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewExamSchedule', required: true },
    image_url: { type: String, required: true },     // Cloudinary URL
    trigger_event: { type: String },                  // What triggered this screenshot
    captured_at: { type: Date, default: Date.now }
}, { collection: 'interview_screenshots' });

InterviewScreenshotSchema.index({ attempt_id: 1 });
InterviewScreenshotSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const InterviewLeaderboardSchema = new mongoose.Schema({
    exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewExamSchedule', required: true },
    candidate_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewCandidate', required: true },
    attempt_id: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewAttempt', required: true },
    rank: { type: Number },
    score: { type: Number },
    percentage: { type: Number },
    correct_answers: { type: Number },
    time_taken_seconds: { type: Number },
    passed: { type: Boolean },
    computed_at: { type: Date, default: Date.now }
}, { collection: 'interview_leaderboard' });

InterviewLeaderboardSchema.index({ exam_id: 1, rank: 1 });
InterviewLeaderboardSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Audit Log ────────────────────────────────────────────────────────────────
const InterviewAuditSchema = new mongoose.Schema({
    actor_id: { type: mongoose.Schema.Types.ObjectId },      // who did the action (admin/instructor/candidate)
    actor_type: { type: String, enum: ['admin', 'instructor', 'candidate'] },
    action: { type: String, required: true },
    target_type: { type: String },                           // 'candidate', 'exam', 'attempt'
    target_id: { type: mongoose.Schema.Types.ObjectId },
    details: { type: Object },
    ip_address: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { collection: 'interview_audit_logs' });

InterviewAuditSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

// ─── Exports ──────────────────────────────────────────────────────────────────
const InterviewCandidate = mongoose.model('InterviewCandidate', InterviewCandidateSchema);
const InterviewExamSchedule = mongoose.model('InterviewExamSchedule', InterviewExamScheduleSchema);
const InterviewQuestion = mongoose.model('InterviewQuestion', InterviewQuestionSchema);
const InterviewAssignment = mongoose.model('InterviewAssignment', InterviewAssignmentSchema);
const InterviewAttempt = mongoose.model('InterviewAttempt', InterviewAttemptSchema);
const InterviewViolation = mongoose.model('InterviewViolation', InterviewViolationSchema);
const InterviewScreenshot = mongoose.model('InterviewScreenshot', InterviewScreenshotSchema);
const InterviewLeaderboard = mongoose.model('InterviewLeaderboard', InterviewLeaderboardSchema);
const InterviewAudit = mongoose.model('InterviewAudit', InterviewAuditSchema);

module.exports = {
    InterviewCandidate,
    InterviewExamSchedule,
    InterviewQuestion,
    InterviewAssignment,
    InterviewAttempt,
    InterviewViolation,
    InterviewScreenshot,
    InterviewLeaderboard,
    InterviewAudit
};