// Run this ONCE on your backend server or Render console
// node fix_exam_batches.js
// OR add as a one-time API route

const mongoose = require('mongoose');
require('dotenv').config();

async function fixExamBatches() {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const { Exam, StudentExamAccess } = require('./models/Exam');
    const { Batch, StudentBatch } = require('./models/Batch');

    const exams = await Exam.find({ $or: [
        { target_batches: { $exists: false } },
        { target_batches: { $size: 0 } }
    ]}).lean();

    console.log(`Found ${exams.length} exams without batches`);

    for (const exam of exams) {
        // Find students with access to this exam
        const accessRecords = await StudentExamAccess.find({
            $or: [{ exam_id: exam._id }, { mock_paper_id: exam._id }]
        }).select('student_id').lean();

        if (accessRecords.length === 0) continue;

        const studentIds = accessRecords.map(a => a.student_id);

        // Find their batch assignments
        const assignments = await StudentBatch.find({
            student_id: { $in: studentIds }
        }).select('batch_id').lean();

        const batchIds = [...new Set(assignments.map(a => a.batch_id?.toString()).filter(Boolean))];

        if (batchIds.length === 0) continue;

        // Update exam with found batch IDs
        await Exam.findByIdAndUpdate(exam._id, {
            $set: { target_batches: batchIds }
        });

        const batches = await Batch.find({ _id: { $in: batchIds } }).select('batch_name').lean();
        console.log(`Updated exam "${exam.title}" with batches: ${batches.map(b => b.batch_name).join(', ')}`);
    }

    console.log('Done!');
    process.exit(0);
}

fixExamBatches().catch(console.error);