/**
 * INTERVIEW EXAMINATION — Socket.IO Handler
 * File: Backend/services/interviewSocket.js
 *
 * Call in server.js inside the io.on('connection', ...) block:
 *   const setupInterviewSocket = require('./services/interviewSocket');
 *   setupInterviewSocket(io, socket);
 */

module.exports = function setupInterviewSocket(io, socket) {

    // Candidate joins their own private room for admin control events
    socket.on('interview_candidate_join', (candidateId) => {
        if (!candidateId) return;
        const room = `interview_candidate_${candidateId}`;
        socket.join(room);
        socket.interviewCandidateId = candidateId;
        console.log(`[Interview Socket] Candidate ${candidateId} joined room ${room}`);
    });

    // Admin/Instructor joins the monitoring room for an exam
    socket.on('interview_monitor_join', (examId) => {
        if (!examId) return;
        const room = `interview_monitor_${examId}`;
        socket.join(room);
        console.log(`[Interview Socket] Admin joined monitor room for exam ${examId}`);
    });

    // Heartbeat from candidate (proves they are still on the exam page)
    socket.on('interview_heartbeat', ({ attempt_id, candidate_id, answers_count }) => {
        // Broadcast to admin monitors so they can see live progress
        socket.broadcast.emit('interview_candidate_heartbeat', {
            candidate_id,
            attempt_id,
            answers_count,
            timestamp: new Date()
        });
    });

    // Candidate disconnects during exam — alert admin
    socket.on('disconnect', () => {
        if (socket.interviewCandidateId) {
            io.emit('interview_candidate_disconnected', {
                candidate_id: socket.interviewCandidateId,
                timestamp: new Date()
            });
            console.log(`[Interview Socket] Candidate ${socket.interviewCandidateId} disconnected`);
        }
    });
};