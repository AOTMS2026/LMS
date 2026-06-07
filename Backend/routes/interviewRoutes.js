/**
 * INTERVIEW EXAMINATION SYSTEM — Express Routes
 * File: Backend/routes/interviewRoutes.js
 *
 * Mount in server.js with:
 *   const interviewRoutes = require('./routes/interviewRoutes');
 *   app.use('/api/interview', interviewRoutes(io, userSockets, sendNotification, cloudinary, authenticateToken, requireRole, getUserRole, handleError));
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
    InterviewCandidate,
    InterviewExamSchedule,
    InterviewQuestion,
    InterviewAssignment,
    InterviewAttempt,
    InterviewViolation,
    InterviewScreenshot,
    InterviewLeaderboard,
    InterviewAudit
} = require('../models/InterviewExam');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_me';
const INTERVIEW_JWT_SECRET = process.env.INTERVIEW_JWT_SECRET || JWT_SECRET + '_interview';

// ─── Helper: Generate Interview JWT ──────────────────────────────────────────
const generateInterviewToken = (candidate) => {
    return jwt.sign(
        { id: candidate._id, username: candidate.username, type: 'interview_candidate' },
        INTERVIEW_JWT_SECRET,
        { expiresIn: '12h' }
    );
};

// ─── Middleware: Authenticate Interview Candidate ─────────────────────────────
const authenticateCandidate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Interview auth token required' });

    try {
        const decoded = jwt.verify(token, INTERVIEW_JWT_SECRET);
        if (decoded.type !== 'interview_candidate') {
            return res.status(403).json({ error: 'Invalid token type' });
        }
        const candidate = await InterviewCandidate.findById(decoded.id).select('-password_hash');
        if (!candidate) return res.status(401).json({ error: 'Candidate account not found' });
        if (candidate.status === 'blocked') return res.status(403).json({ error: 'Your account has been blocked by the administrator.' });
        req.candidate = candidate;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired interview token' });
    }
};

// ─── Factory: create route handler (injects dependencies from server.js) ─────
module.exports = (io, userSockets, sendNotification, cloudinary, authenticateToken, requireRole, getUserRole, handleError) => {

    const requireInstructor = requireRole(['admin', 'manager', 'instructor']);
    const requireAdmin = requireRole(['admin']);
    const requireAdminOrManager = requireRole(['admin', 'manager']);

    // Helper: log audit
    const audit = async (actorId, actorType, action, targetType, targetId, details, ip) => {
        try {
            await InterviewAudit.create({ actor_id: actorId, actor_type, action, target_type: targetType, target_id: targetId, details, ip_address: ip });
        } catch (e) { /* non-blocking */ }
    };

    // Helper: emit to candidate's socket room
    const emitToCandidate = (candidateId, event, data) => {
        const room = `interview_candidate_${candidateId}`;
        io.to(room).emit(event, data);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 1: CANDIDATE AUTH (No existing LMS auth used)
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/auth/login
    router.post('/auth/login', async (req, res) => {
        const { username, password } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
            if (!username || !password) {
                return res.status(400).json({ error: 'Username and password are required' });
            }

            const candidate = await InterviewCandidate.findOne({
                $or: [
                    { username: username.trim() },
                    { email: username.trim().toLowerCase() }
                ]
            });

            if (!candidate) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (candidate.status === 'blocked') {
                return res.status(403).json({ error: 'Your account has been blocked. Please contact the administrator.' });
            }

            const isMatch = await bcrypt.compare(password, candidate.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Update last login
            candidate.last_login_at = new Date();
            candidate.last_login_ip = ip;
            await candidate.save();

            const token = generateInterviewToken(candidate);

            await audit(candidate._id, 'candidate', 'login', 'candidate', candidate._id, { ip }, ip);

            res.json({
                token,
                candidate: {
                    id: candidate._id,
                    username: candidate.username,
                    full_name: candidate.full_name,
                    email: candidate.email,
                    assigned_exam_id: candidate.assigned_exam_id,
                    exam_schedule: candidate.exam_schedule,
                    status: candidate.status
                }
            });
        } catch (err) {
            handleError(res, err, 'interview-candidate-login');
        }
    });

    // GET /api/interview/auth/me  — Candidate fetches own dashboard data
    router.get('/auth/me', authenticateCandidate, async (req, res) => {
        try {
            const candidate = req.candidate;
            let examDetails = null;

            if (candidate.assigned_exam_id) {
                examDetails = await InterviewExamSchedule.findById(candidate.assigned_exam_id)
                    .select('title topic difficulty duration_minutes passing_percentage scheduled_date scheduled_time')
                    .lean();
            }

            // Determine exam status
            let examStatus = 'upcoming';
            if (examDetails) {
                const now = new Date();
                const examStart = new Date(`${examDetails.scheduled_date}T${examDetails.scheduled_time}:00`);
                const examEnd = new Date(examStart.getTime() + examDetails.duration_minutes * 60000);

                if (now >= examStart && now <= examEnd) {
                    examStatus = 'active';
                } else if (now > examEnd) {
                    examStatus = 'completed';
                }

                // Check if already attempted
                const attempt = await InterviewAttempt.findOne({
                    candidate_id: candidate._id,
                    exam_id: candidate.assigned_exam_id,
                    status: { $in: ['submitted', 'auto_submitted', 'force_submitted', 'blocked'] }
                });
                if (attempt) examStatus = 'completed';
            }

            if (candidate.status === 'blocked') examStatus = 'blocked';

            res.json({
                candidate: {
                    id: candidate._id,
                    full_name: candidate.full_name,
                    email: candidate.email,
                    username: candidate.username,
                    mobile_number: candidate.mobile_number,
                    status: candidate.status
                },
                exam: examDetails,
                exam_status: examStatus
            });
        } catch (err) {
            handleError(res, err, 'interview-candidate-me');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 2: INSTRUCTOR — CANDIDATE MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/candidates  — Create new candidate (Instructor only)
    router.post('/candidates', authenticateToken, requireInstructor, async (req, res) => {
        const { full_name, email, mobile_number, username, password, assigned_exam_id, scheduled_date, scheduled_time, duration_minutes } = req.body;
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        try {
            if (!full_name || !email || !username || !password) {
                return res.status(400).json({ error: 'full_name, email, username, and password are required' });
            }

            // Check uniqueness
            const existing = await InterviewCandidate.findOne({ $or: [{ username }, { email }] });
            if (existing) {
                return res.status(400).json({ error: 'Username or email already exists' });
            }

            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);

            const candidate = await InterviewCandidate.create({
                full_name,
                email: email.toLowerCase().trim(),
                mobile_number,
                username: username.trim(),
                password_hash,
                created_by: req.user.id,
                assigned_exam_id: assigned_exam_id || null,
                exam_schedule: {
                    date: scheduled_date,
                    time: scheduled_time,
                    duration_minutes: duration_minutes
                },
                status: 'active'
            });

            // If assigned to exam, also create an assignment record
            if (assigned_exam_id) {
                await InterviewAssignment.findOneAndUpdate(
                    { exam_id: assigned_exam_id, candidate_id: candidate._id },
                    { assigned_by: req.user.id, assigned_at: new Date(), scheduled_date, scheduled_time, duration_minutes },
                    { upsert: true }
                );
            }

            await audit(req.user.id, 'instructor', 'create_candidate', 'candidate', candidate._id, { full_name, email, username }, ip);

            res.json({
                message: 'Interview candidate created successfully',
                candidate: {
                    id: candidate._id,
                    full_name: candidate.full_name,
                    email: candidate.email,
                    username: candidate.username,
                    mobile_number: candidate.mobile_number,
                    status: candidate.status,
                    assigned_exam_id: candidate.assigned_exam_id
                },
                // Return plain password so instructor can share with candidate
                credentials: { username, password }
            });
        } catch (err) {
            handleError(res, err, 'interview-create-candidate');
        }
    });

    // GET /api/interview/candidates  — List all candidates (Instructor)
    router.get('/candidates', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const role = await getUserRole(req.user.id);
            const filter = (role === 'admin' || role === 'manager') ? {} : { created_by: req.user.id };

            const candidates = await InterviewCandidate.find(filter)
                .select('-password_hash')
                .sort({ created_at: -1 })
                .lean();

            // Enrich with exam title
            const examIds = [...new Set(candidates.map(c => c.assigned_exam_id).filter(Boolean))];
            const exams = await InterviewExamSchedule.find({ _id: { $in: examIds } }).select('title scheduled_date scheduled_time').lean();
            const examMap = exams.reduce((acc, e) => { acc[e._id.toString()] = e; return acc; }, {});

            const enriched = candidates.map(c => ({
                ...c,
                id: c._id,
                exam_title: c.assigned_exam_id ? examMap[c.assigned_exam_id.toString()]?.title : null,
                exam_date: c.assigned_exam_id ? examMap[c.assigned_exam_id.toString()]?.scheduled_date : c.exam_schedule?.date,
                exam_time: c.assigned_exam_id ? examMap[c.assigned_exam_id.toString()]?.scheduled_time : c.exam_schedule?.time
            }));

            res.json(enriched);
        } catch (err) {
            handleError(res, err, 'interview-list-candidates');
        }
    });

    // PUT /api/interview/candidates/:id  — Update candidate
    router.put('/candidates/:id', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const { password, ...updateData } = req.body;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                updateData.password_hash = await bcrypt.hash(password, salt);
            }
            updateData.updated_at = new Date();

            const candidate = await InterviewCandidate.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password_hash');
            if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

            res.json({ message: 'Candidate updated', candidate });
        } catch (err) {
            handleError(res, err, 'interview-update-candidate');
        }
    });

    // DELETE /api/interview/candidates/:id
    router.delete('/candidates/:id', authenticateToken, requireAdminOrManager, async (req, res) => {
        try {
            await InterviewCandidate.findByIdAndDelete(req.params.id);
            await InterviewAssignment.deleteMany({ candidate_id: req.params.id });
            res.json({ message: 'Candidate deleted' });
        } catch (err) {
            handleError(res, err, 'interview-delete-candidate');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 3: INSTRUCTOR — EXAM MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/exams  — Create exam
    router.post('/exams', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const examData = { ...req.body, created_by: req.user.id };
            const exam = await InterviewExamSchedule.create(examData);
            res.json({ message: 'Exam created', exam });
        } catch (err) {
            handleError(res, err, 'interview-create-exam');
        }
    });

    // GET /api/interview/exams  — List exams
    router.get('/exams', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const role = await getUserRole(req.user.id);
            const filter = (role === 'admin' || role === 'manager') ? {} : { created_by: req.user.id };
            const exams = await InterviewExamSchedule.find(filter).sort({ created_at: -1 }).lean();

            // Enrich with question count
            const examIds = exams.map(e => e._id);
            const qCounts = await InterviewQuestion.aggregate([
                { $match: { exam_id: { $in: examIds } } },
                { $group: { _id: '$exam_id', count: { $sum: 1 } } }
            ]);
            const qMap = qCounts.reduce((acc, q) => { acc[q._id.toString()] = q.count; return acc; }, {});

            const enriched = exams.map(e => ({
                ...e,
                id: e._id,
                question_count: qMap[e._id.toString()] || 0
            }));

            res.json(enriched);
        } catch (err) {
            handleError(res, err, 'interview-list-exams');
        }
    });

    // GET /api/interview/exams/:id
    router.get('/exams/:id', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const exam = await InterviewExamSchedule.findById(req.params.id).lean();
            if (!exam) return res.status(404).json({ error: 'Exam not found' });
            res.json({ ...exam, id: exam._id });
        } catch (err) {
            handleError(res, err, 'interview-get-exam');
        }
    });

    // PUT /api/interview/exams/:id
    router.put('/exams/:id', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const exam = await InterviewExamSchedule.findByIdAndUpdate(
                req.params.id,
                { ...req.body, updated_at: new Date() },
                { new: true }
            );
            if (!exam) return res.status(404).json({ error: 'Exam not found' });
            res.json({ message: 'Exam updated', exam });
        } catch (err) {
            handleError(res, err, 'interview-update-exam');
        }
    });

    // DELETE /api/interview/exams/:id
    router.delete('/exams/:id', authenticateToken, requireAdminOrManager, async (req, res) => {
        try {
            await InterviewExamSchedule.findByIdAndDelete(req.params.id);
            await InterviewQuestion.deleteMany({ exam_id: req.params.id });
            await InterviewAssignment.deleteMany({ exam_id: req.params.id });
            res.json({ message: 'Exam deleted' });
        } catch (err) {
            handleError(res, err, 'interview-delete-exam');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 4: AI QUESTION GENERATION
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/exams/:id/generate-questions
    router.post('/exams/:examId/generate-questions', authenticateToken, requireInstructor, async (req, res) => {
        const { examId } = req.params;
        const { topic, count, difficulty } = req.body;

        try {
            const exam = await InterviewExamSchedule.findById(examId);
            if (!exam) return res.status(404).json({ error: 'Exam not found' });

            // Use the same N8N MCQ generator already in server.js
            const N8N_MCQ_WEBHOOK = process.env.N8N_MCQ_GENERATOR_URL || 'https://aotms.app.n8n.cloud/webhook/generate-quiz';

            const response = await axios.post(N8N_MCQ_WEBHOOK, {
                topic: topic || exam.topic,
                count: count || exam.num_questions,
                difficulty: difficulty || exam.difficulty,
                type: 'mcq',
                context: `Interview examination for ${topic || exam.topic}`,
                timestamp: new Date().toISOString()
            }, { timeout: 120000 });

            let generatedQuestions = [];
            const data = Array.isArray(response.data) ? response.data[0] : response.data;

            // Normalize AI response — handle various response shapes from n8n
            if (data && data.questions && Array.isArray(data.questions)) {
                generatedQuestions = data.questions;
            } else if (Array.isArray(data)) {
                generatedQuestions = data;
            }

            // Delete existing AI questions for this exam and replace
            await InterviewQuestion.deleteMany({ exam_id: examId, source: 'ai' });

            const toInsert = generatedQuestions.map((q, idx) => ({
                exam_id: examId,
                question_text: q.question || q.question_text || q.text,
                options: (q.options || []).map((opt, i) => ({
                    text: typeof opt === 'string' ? opt : opt.text,
                    is_correct: (typeof opt === 'object' && opt.is_correct) ||
                        (q.correct_answer && (q.correct_answer === opt || q.correct_answer === opt.text))
                })),
                correct_answer: q.correct_answer || q.answer,
                explanation: q.explanation || q.explanation_text || '',
                difficulty: difficulty || exam.difficulty,
                marks: 1,
                source: 'ai',
                order_index: idx
            }));

            const saved = await InterviewQuestion.insertMany(toInsert);

            res.json({
                message: `${saved.length} questions generated and saved`,
                questions: saved
            });
        } catch (err) {
            handleError(res, err, 'interview-generate-questions');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 5: QUESTION CRUD (Manual + Edit AI questions)
    // ─────────────────────────────────────────────────────────────────────────

    // GET /api/interview/exams/:examId/questions
    router.get('/exams/:examId/questions', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const questions = await InterviewQuestion.find({ exam_id: req.params.examId })
                .sort({ order_index: 1, created_at: 1 })
                .lean();
            res.json(questions.map(q => ({ ...q, id: q._id })));
        } catch (err) {
            handleError(res, err, 'interview-list-questions');
        }
    });

    // POST /api/interview/exams/:examId/questions  — Manual question
    router.post('/exams/:examId/questions', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const question = await InterviewQuestion.create({
                ...req.body,
                exam_id: req.params.examId,
                source: 'manual'
            });
            res.json({ message: 'Question added', question });
        } catch (err) {
            handleError(res, err, 'interview-add-question');
        }
    });

    // PUT /api/interview/questions/:id
    router.put('/questions/:id', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const question = await InterviewQuestion.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!question) return res.status(404).json({ error: 'Question not found' });
            res.json({ message: 'Question updated', question });
        } catch (err) {
            handleError(res, err, 'interview-update-question');
        }
    });

    // DELETE /api/interview/questions/:id
    router.delete('/questions/:id', authenticateToken, requireInstructor, async (req, res) => {
        try {
            await InterviewQuestion.findByIdAndDelete(req.params.id);
            res.json({ message: 'Question deleted' });
        } catch (err) {
            handleError(res, err, 'interview-delete-question');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 6: CANDIDATE ASSIGNMENT TO EXAM
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/exams/:examId/assign  — Assign one/many/batch candidates
    router.post('/exams/:examId/assign', authenticateToken, requireInstructor, async (req, res) => {
        const { candidate_ids } = req.body; // Array of candidate IDs
        const { examId } = req.params;

        try {
            if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
                return res.status(400).json({ error: 'candidate_ids array is required' });
            }

            const exam = await InterviewExamSchedule.findById(examId);
            if (!exam) return res.status(404).json({ error: 'Exam not found' });

            const operations = candidate_ids.map(cid => ({
                updateOne: {
                    filter: { exam_id: examId, candidate_id: cid },
                    update: {
                        $set: {
                            assigned_by: req.user.id,
                            assigned_at: new Date(),
                            scheduled_date: exam.scheduled_date,
                            scheduled_time: exam.scheduled_time,
                            duration_minutes: exam.duration_minutes
                        }
                    },
                    upsert: true
                }
            }));

            await InterviewAssignment.bulkWrite(operations);

            // Update each candidate's assigned_exam_id
            await InterviewCandidate.updateMany(
                { _id: { $in: candidate_ids } },
                {
                    $set: {
                        assigned_exam_id: examId,
                        exam_schedule: {
                            date: exam.scheduled_date,
                            time: exam.scheduled_time,
                            duration_minutes: exam.duration_minutes
                        },
                        updated_at: new Date()
                    }
                }
            );

            res.json({ message: `${candidate_ids.length} candidate(s) assigned to exam` });
        } catch (err) {
            handleError(res, err, 'interview-assign-candidates');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 7: EXAM ENGINE (Candidate-facing)
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/exam/start  — Candidate starts the exam
    router.post('/exam/start', authenticateCandidate, async (req, res) => {
        try {
            const candidate = req.candidate;

            if (!candidate.assigned_exam_id) {
                return res.status(400).json({ error: 'No exam assigned to your account.' });
            }

            if (candidate.status === 'blocked') {
                return res.status(403).json({ error: 'Your account has been blocked.' });
            }

            const exam = await InterviewExamSchedule.findById(candidate.assigned_exam_id);
            if (!exam) return res.status(404).json({ error: 'Assigned exam not found' });

            // Time gate: allow start only in the exam window
            const now = new Date();
            const examStart = new Date(`${exam.scheduled_date}T${exam.scheduled_time}:00`);
            const examEnd = new Date(examStart.getTime() + exam.duration_minutes * 60000);

            if (now < examStart) {
                return res.status(403).json({
                    error: `Exam has not started yet. Please wait until ${exam.scheduled_date} at ${exam.scheduled_time}.`
                });
            }
            if (now > examEnd) {
                return res.status(403).json({ error: 'Exam time has expired.' });
            }

            // Check if already submitted
            const existingAttempt = await InterviewAttempt.findOne({
                candidate_id: candidate._id,
                exam_id: candidate.assigned_exam_id,
                status: { $in: ['submitted', 'auto_submitted', 'force_submitted', 'blocked'] }
            });
            if (existingAttempt) {
                return res.status(400).json({ error: 'You have already submitted this exam.' });
            }

            // Get or create in-progress attempt
            let attempt = await InterviewAttempt.findOne({
                candidate_id: candidate._id,
                exam_id: candidate.assigned_exam_id,
                status: 'in_progress'
            });

            if (!attempt) {
                attempt = await InterviewAttempt.create({
                    exam_id: candidate.assigned_exam_id,
                    candidate_id: candidate._id,
                    status: 'in_progress',
                    started_at: new Date(),
                    total_questions: exam.num_questions
                });
            }

            // Fetch questions (shuffle for security)
            const questions = await InterviewQuestion.find({ exam_id: candidate.assigned_exam_id })
                .lean();

            const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, exam.num_questions);

            const safeQuestions = shuffled.map((q, idx) => ({
                id: q._id,
                order: idx + 1,
                question_text: q.question_text,
                marks: q.marks,
                options: q.options.map(opt => ({
                    id: opt._id,
                    text: opt.text
                    // is_correct is NOT sent to client during exam
                }))
            }));

            const timeRemaining = Math.max(0, Math.floor((examEnd - now) / 1000));

            res.json({
                attempt_id: attempt._id,
                exam: {
                    id: exam._id,
                    title: exam.title,
                    duration_minutes: exam.duration_minutes,
                    num_questions: exam.num_questions,
                    anti_cheat: exam.anti_cheat
                },
                questions: safeQuestions,
                existing_answers: Object.fromEntries(attempt.answers || new Map()),
                time_remaining_seconds: timeRemaining,
                started_at: attempt.started_at
            });
        } catch (err) {
            handleError(res, err, 'interview-exam-start');
        }
    });

    // POST /api/interview/exam/save-answer  — Auto-save single answer
    router.post('/exam/save-answer', authenticateCandidate, async (req, res) => {
        const { attempt_id, question_id, answer } = req.body;
        try {
            await InterviewAttempt.findOneAndUpdate(
                { _id: attempt_id, candidate_id: req.candidate._id, status: 'in_progress' },
                { $set: { [`answers.${question_id}`]: answer } }
            );
            res.json({ saved: true });
        } catch (err) {
            handleError(res, err, 'interview-save-answer');
        }
    });

    // POST /api/interview/exam/submit  — Final submission
    router.post('/exam/submit', authenticateCandidate, async (req, res) => {
        const { attempt_id, answers, time_taken_seconds } = req.body;
        try {
            const attempt = await InterviewAttempt.findOne({
                _id: attempt_id,
                candidate_id: req.candidate._id,
                status: 'in_progress'
            });
            if (!attempt) return res.status(400).json({ error: 'No active attempt found.' });

            const exam = await InterviewExamSchedule.findById(attempt.exam_id);
            const questions = await InterviewQuestion.find({ exam_id: attempt.exam_id }).lean();

            // Merge saved + submitted answers (submitted takes priority)
            const finalAnswers = { ...Object.fromEntries(attempt.answers || new Map()), ...(answers || {}) };

            // Grade
            let correct = 0, wrong = 0, unanswered = 0, score = 0;
            const snapshot = [];

            for (const q of questions) {
                const studentAns = finalAnswers[q._id.toString()];
                let isCorrect = false;

                if (!studentAns) {
                    unanswered++;
                } else {
                    const correctOpt = q.options.find(o => o.is_correct);
                    if (correctOpt) {
                        if (studentAns === correctOpt._id?.toString() || studentAns === correctOpt.text) {
                            isCorrect = true;
                            correct++;
                            score += (q.marks || 1);
                        } else {
                            wrong++;
                        }
                    }
                }

                snapshot.push({
                    question_id: q._id,
                    question_text: q.question_text,
                    options: q.options,
                    correct_answer: q.options.find(o => o.is_correct)?.text || '',
                    student_answer: studentAns || '',
                    is_correct: isCorrect,
                    marks: q.marks || 1
                });
            }

            const totalQ = questions.length;
            const percentage = totalQ > 0 ? (score / totalQ) * 100 : 0;
            const passed = percentage >= (exam?.passing_percentage || 50);

            await InterviewAttempt.findByIdAndUpdate(attempt_id, {
                status: 'submitted',
                submitted_at: new Date(),
                time_taken_seconds: time_taken_seconds || 0,
                answers: finalAnswers,
                total_questions: totalQ,
                correct_answers: correct,
                wrong_answers: wrong,
                unanswered,
                score,
                percentage,
                passed,
                questions_snapshot: snapshot
            });

            // Update leaderboard
            await _refreshLeaderboard(attempt.exam_id);

            // Notify admin via socket
            io.emit('interview_exam_submitted', {
                candidate_id: req.candidate._id,
                candidate_name: req.candidate.full_name,
                exam_id: attempt.exam_id,
                score, percentage, passed
            });

            res.json({
                message: 'Exam submitted successfully',
                result: { score, total: totalQ, correct, wrong, unanswered, percentage, passed }
            });
        } catch (err) {
            handleError(res, err, 'interview-exam-submit');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 8: ANTI-CHEAT — Violation Logging & Screenshot Upload
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/violations  — Log a violation event
    router.post('/violations', authenticateCandidate, async (req, res) => {
        const { attempt_id, violation_type, metadata } = req.body;
        try {
            const attempt = await InterviewAttempt.findOne({
                _id: attempt_id,
                candidate_id: req.candidate._id,
                status: 'in_progress'
            });
            if (!attempt) return res.status(400).json({ error: 'No active attempt found' });

            const exam = await InterviewExamSchedule.findById(attempt.exam_id).select('anti_cheat').lean();

            // Count existing violations of this type for this attempt
            const prevCount = await InterviewViolation.countDocuments({
                attempt_id,
                violation_type: { $in: ['tab_switch', 'window_blur', 'fullscreen_exit'] }
            });

            const warningNumber = prevCount + 1;
            const maxViolations = exam?.anti_cheat?.max_tab_switches || 3;

            const violation = await InterviewViolation.create({
                attempt_id,
                candidate_id: req.candidate._id,
                exam_id: attempt.exam_id,
                violation_type,
                warning_number: warningNumber,
                metadata
            });

            // Update attempt violation count
            await InterviewAttempt.findByIdAndUpdate(attempt_id, { $inc: { tab_switch_count: 1 } });

            // Notify admin in real-time
            io.emit('interview_violation', {
                candidate_id: req.candidate._id,
                candidate_name: req.candidate.full_name,
                exam_id: attempt.exam_id,
                attempt_id,
                violation_type,
                warning_number: warningNumber,
                timestamp: new Date()
            });

            let response = { logged: true, warning_number: warningNumber };

            // Auto-action on max violations
            if (warningNumber >= maxViolations) {
                const action = exam?.anti_cheat?.action_on_max_violations || 'submit';
                response.action = action;

                if (action === 'block') {
                    await InterviewAttempt.findByIdAndUpdate(attempt_id, { status: 'blocked', submitted_at: new Date() });
                    await InterviewCandidate.findByIdAndUpdate(req.candidate._id, { status: 'blocked' });
                    io.emit('interview_candidate_blocked', { candidate_id: req.candidate._id, attempt_id });
                } else {
                    // auto_submit
                    await InterviewAttempt.findByIdAndUpdate(attempt_id, { status: 'auto_submitted', submitted_at: new Date() });
                    io.emit('interview_auto_submitted', { candidate_id: req.candidate._id, attempt_id });
                }
                response.message = `Maximum violations reached. Exam ${action === 'block' ? 'blocked' : 'auto-submitted'}.`;
            } else {
                response.warnings_left = maxViolations - warningNumber;
                response.message = `Warning ${warningNumber} of ${maxViolations}`;
            }

            res.json(response);
        } catch (err) {
            handleError(res, err, 'interview-log-violation');
        }
    });

    // POST /api/interview/screenshots  — Upload screenshot evidence
    router.post('/screenshots', authenticateCandidate, upload.single('screenshot'), async (req, res) => {
        const { attempt_id, trigger_event } = req.body;
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const b64 = Buffer.from(req.file.buffer).toString('base64');
            const dataURI = `data:${req.file.mimetype};base64,${b64}`;

            const result = await cloudinary.uploader.upload(dataURI, {
                folder: `interview_screenshots/${attempt_id}`,
                resource_type: 'image'
            });

            const attempt = await InterviewAttempt.findById(attempt_id).select('exam_id');
            const screenshot = await InterviewScreenshot.create({
                attempt_id,
                candidate_id: req.candidate._id,
                exam_id: attempt?.exam_id,
                image_url: result.secure_url,
                trigger_event: trigger_event || 'violation'
            });

            await InterviewAttempt.findByIdAndUpdate(attempt_id, { $inc: { screenshot_count: 1 } });

            // Alert admin
            io.emit('interview_screenshot_taken', {
                candidate_id: req.candidate._id,
                attempt_id,
                image_url: result.secure_url,
                trigger_event
            });

            res.json({ saved: true, screenshot_id: screenshot._id, url: result.secure_url });
        } catch (err) {
            handleError(res, err, 'interview-upload-screenshot');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 9: REAL-TIME ADMIN MONITORING
    // ─────────────────────────────────────────────────────────────────────────

    // GET /api/interview/monitor/live  — Get all active exam attempts
    router.get('/monitor/live', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const role = await getUserRole(req.user.id);
            const examFilter = (role === 'admin' || role === 'manager') ? {} : { created_by: req.user.id };
            const myExams = await InterviewExamSchedule.find(examFilter).select('_id').lean();
            const myExamIds = myExams.map(e => e._id);

            const activeAttempts = await InterviewAttempt.find({
                exam_id: { $in: myExamIds },
                status: 'in_progress'
            })
                .populate('candidate_id', 'full_name email username')
                .populate('exam_id', 'title duration_minutes scheduled_date scheduled_time')
                .lean();

            const now = new Date();
            const enriched = activeAttempts.map(a => {
                const examStart = a.started_at ? new Date(a.started_at) : now;
                const durationMs = (a.exam_id?.duration_minutes || 60) * 60000;
                const timeRemainingS = Math.max(0, Math.floor((examStart.getTime() + durationMs - now.getTime()) / 1000));

                // Determine status label for display
                let displayStatus = 'Active';
                if (a.tab_switch_count >= 2) displayStatus = 'Suspicious';
                if (a.tab_switch_count >= 1) displayStatus = 'Warning';

                return {
                    attempt_id: a._id,
                    candidate_id: a.candidate_id?._id,
                    candidate_name: a.candidate_id?.full_name,
                    candidate_email: a.candidate_id?.email,
                    exam_id: a.exam_id?._id,
                    exam_title: a.exam_id?.title,
                    progress_percent: Math.round(
                        (Object.keys(Object.fromEntries(a.answers || new Map())).length / (a.total_questions || 1)) * 100
                    ),
                    time_remaining_seconds: timeRemainingS,
                    tab_switch_count: a.tab_switch_count || 0,
                    fullscreen_violation_count: a.fullscreen_violation_count || 0,
                    screenshot_count: a.screenshot_count || 0,
                    started_at: a.started_at,
                    display_status: displayStatus,
                    status: a.status
                };
            });

            res.json(enriched);
        } catch (err) {
            handleError(res, err, 'interview-monitor-live');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 10: ADMIN CONTROLS (Pause, Resume, Stop, Force Submit, Block)
    // ─────────────────────────────────────────────────────────────────────────

    // POST /api/interview/admin/control  — Real-time exam control
    router.post('/admin/control', authenticateToken, requireInstructor, async (req, res) => {
        const { action, attempt_id, candidate_id } = req.body;
        const validActions = ['pause', 'resume', 'stop', 'force_submit', 'block_candidate'];

        try {
            if (!validActions.includes(action)) {
                return res.status(400).json({ error: 'Invalid action' });
            }

            const attempt = await InterviewAttempt.findById(attempt_id);
            if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

            let updateData = {};
            let socketEvent = '';
            let socketPayload = { attempt_id, candidate_id: attempt.candidate_id, action };

            switch (action) {
                case 'pause':
                    updateData = { paused_at: new Date(), paused_by: req.user.id };
                    socketEvent = 'interview_exam_paused';
                    break;
                case 'resume':
                    updateData = { $unset: { paused_at: '', paused_by: '' } };
                    socketEvent = 'interview_exam_resumed';
                    break;
                case 'stop':
                case 'force_submit':
                    updateData = {
                        status: 'force_submitted',
                        submitted_at: new Date(),
                        force_submitted_by: req.user.id
                    };
                    socketEvent = 'interview_exam_force_submitted';
                    await _refreshLeaderboard(attempt.exam_id);
                    break;
                case 'block_candidate':
                    updateData = { status: 'blocked', submitted_at: new Date() };
                    await InterviewCandidate.findByIdAndUpdate(attempt.candidate_id, { status: 'blocked' });
                    socketEvent = 'interview_candidate_blocked';
                    break;
            }

            if (action === 'resume') {
                await InterviewAttempt.findByIdAndUpdate(attempt_id, updateData);
            } else {
                await InterviewAttempt.findByIdAndUpdate(attempt_id, updateData);
            }

            // Emit control event to candidate's room (candidate listens for this)
            const candidateRoom = `interview_candidate_${attempt.candidate_id}`;
            io.to(candidateRoom).emit(socketEvent, socketPayload);

            // Also broadcast to all admin monitors
            io.emit(socketEvent, socketPayload);

            await audit(req.user.id, 'admin', action, 'attempt', attempt_id, { candidate_id: attempt.candidate_id }, req.headers['x-forwarded-for'] || req.socket.remoteAddress);

            res.json({ message: `Action '${action}' executed successfully` });
        } catch (err) {
            handleError(res, err, 'interview-admin-control');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 11: RESULTS & ANALYTICS
    // ─────────────────────────────────────────────────────────────────────────

    // GET /api/interview/results/:examId  — Full result analytics for an exam
    router.get('/results/:examId', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const attempts = await InterviewAttempt.find({
                exam_id: req.params.examId,
                status: { $in: ['submitted', 'auto_submitted', 'force_submitted', 'blocked'] }
            })
                .populate('candidate_id', 'full_name email username mobile_number')
                .lean();

            const results = await Promise.all(attempts.map(async (a) => {
                const violations = await InterviewViolation.find({ attempt_id: a._id }).lean();
                const screenshots = await InterviewScreenshot.find({ attempt_id: a._id }).select('image_url trigger_event captured_at').lean();

                return {
                    attempt_id: a._id,
                    candidate: {
                        id: a.candidate_id?._id,
                        name: a.candidate_id?.full_name,
                        email: a.candidate_id?.email,
                        username: a.candidate_id?.username,
                        mobile: a.candidate_id?.mobile_number
                    },
                    exam: {
                        total_questions: a.total_questions,
                        correct_answers: a.correct_answers,
                        wrong_answers: a.wrong_answers,
                        unanswered: a.unanswered,
                        score: a.score,
                        percentage: Math.round(a.percentage || 0),
                        passed: a.passed,
                        pass_fail: a.passed ? 'Pass' : 'Fail'
                    },
                    timing: {
                        started_at: a.started_at,
                        submitted_at: a.submitted_at,
                        time_taken_seconds: a.time_taken_seconds,
                        status: a.status
                    },
                    integrity: {
                        tab_switch_count: a.tab_switch_count || 0,
                        fullscreen_violations: a.fullscreen_violation_count || 0,
                        screenshot_count: a.screenshot_count || 0,
                        violation_log: violations,
                        screenshots
                    }
                };
            }));

            res.json(results);
        } catch (err) {
            handleError(res, err, 'interview-results');
        }
    });

    // GET /api/interview/candidate-result  — Candidate views own result (after submission)
    router.get('/candidate-result', authenticateCandidate, async (req, res) => {
        try {
            const attempt = await InterviewAttempt.findOne({
                candidate_id: req.candidate._id,
                status: { $in: ['submitted', 'auto_submitted', 'force_submitted', 'blocked'] }
            }).lean();

            if (!attempt) return res.status(404).json({ error: 'No submitted attempt found' });

            const exam = await InterviewExamSchedule.findById(attempt.exam_id).select('title').lean();

            res.json({
                exam_name: exam?.title || 'Interview Exam',
                submission_time: attempt.submitted_at,
                status: attempt.status,
                // Do NOT reveal answers or correct options to candidate
                score_revealed: false
            });
        } catch (err) {
            handleError(res, err, 'interview-candidate-result');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 12: LEADERBOARD
    // ─────────────────────────────────────────────────────────────────────────

    // GET /api/interview/leaderboard/:examId
    router.get('/leaderboard/:examId', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const board = await InterviewLeaderboard.find({ exam_id: req.params.examId })
                .populate('candidate_id', 'full_name email')
                .sort({ rank: 1 })
                .lean();

            res.json(board.map(b => ({
                rank: b.rank,
                candidate_name: b.candidate_id?.full_name,
                candidate_email: b.candidate_id?.email,
                score: b.score,
                percentage: Math.round(b.percentage),
                correct_answers: b.correct_answers,
                time_taken_seconds: b.time_taken_seconds,
                passed: b.passed
            })));
        } catch (err) {
            handleError(res, err, 'interview-leaderboard');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // SECTION 13: VIOLATION LOG VIEW
    // ─────────────────────────────────────────────────────────────────────────

    // GET /api/interview/violations/:attemptId
    router.get('/violations/:attemptId', authenticateToken, requireInstructor, async (req, res) => {
        try {
            const violations = await InterviewViolation.find({ attempt_id: req.params.attemptId })
                .sort({ timestamp: 1 })
                .lean();
            res.json(violations);
        } catch (err) {
            handleError(res, err, 'interview-get-violations');
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    async function _refreshLeaderboard(examId) {
        try {
            const attempts = await InterviewAttempt.find({
                exam_id: examId,
                status: { $in: ['submitted', 'auto_submitted', 'force_submitted'] }
            }).lean();

            // Sort: percentage DESC, then correct_answers DESC, then time ASC
            const sorted = attempts.sort((a, b) => {
                if (b.percentage !== a.percentage) return b.percentage - a.percentage;
                if (b.correct_answers !== a.correct_answers) return b.correct_answers - a.correct_answers;
                return (a.time_taken_seconds || 99999) - (b.time_taken_seconds || 99999);
            });

            // Rebuild leaderboard
            await InterviewLeaderboard.deleteMany({ exam_id: examId });
            const entries = sorted.map((a, idx) => ({
                exam_id: examId,
                candidate_id: a.candidate_id,
                attempt_id: a._id,
                rank: idx + 1,
                score: a.score,
                percentage: a.percentage,
                correct_answers: a.correct_answers,
                time_taken_seconds: a.time_taken_seconds,
                passed: a.passed
            }));
            if (entries.length > 0) {
                await InterviewLeaderboard.insertMany(entries);
            }

            // Broadcast updated leaderboard via socket
            io.emit('interview_leaderboard_updated', { exam_id: examId, count: entries.length });
        } catch (e) {
            console.error('[Interview] Leaderboard refresh error:', e.message);
        }
    }

    return router;
};