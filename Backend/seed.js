const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { User, Profile, UserRole } = require('./models/User');
const { Course, Enrollment } = require('./models/Course');
const { Batch, StudentBatch } = require('./models/Batch');
const { Exam, QuestionBank, ExamResult, StudentExamAccess } = require('./models/Exam');
const { LeaderboardStat } = require('./models/System');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected for seeding...');
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
};

// ─── USER DATA ───────────────────────────────────────────────────────────────
const usersToSeed = [
    // Admin / Staff
    { email: '23hp1a0548@gmail.com',       password: 'Admin@2024!',       fullName: 'System Admin',         role: 'admin',      courseType: 'full_time',  phone: '9000000001', rollNumber: '23HP1A0548', department: 'CSE',   year: '4' },
    { email: '23hp1a0549@gmail.com',       password: 'Manager@2024!',     fullName: 'System Manager',       role: 'manager',    courseType: 'full_time',  phone: '9000000002', rollNumber: '23HP1A0549', department: 'CSE',   year: '4' },
    { email: 'maheshchoudare21@gmail.com', password: 'Instructor@2024!',  fullName: 'Mahesh Choudare',      role: 'instructor', courseType: 'full_time',  phone: '9000000003', rollNumber: '23HP1A0550', department: 'CSE',   year: '4' },

    // Students (20 students)
    { email: 'anuraguthu31@gmail.com',     password: 'Anu@2005',          fullName: 'Anu Raguthu',          role: 'student',    courseType: 'full_time',  phone: '9100000001', rollNumber: '23HP1A0501', department: 'CSE',   year: '3' },
    { email: 'maheshgutha21@gmail.com',    password: 'Mahesh@2005',       fullName: 'Mahesh Gutha',         role: 'student',    courseType: 'full_time',  phone: '9100000002', rollNumber: '23HP1A0502', department: 'CSE',   year: '3' },
    { email: 'priya.sharma22@gmail.com',   password: 'Priya@2005',        fullName: 'Priya Sharma',         role: 'student',    courseType: 'full_time',  phone: '9100000003', rollNumber: '23HP1A0503', department: 'ECE',   year: '2' },
    { email: 'rahul.verma23@gmail.com',    password: 'Rahul@2005',        fullName: 'Rahul Verma',          role: 'student',    courseType: 'full_time',  phone: '9100000004', rollNumber: '23HP1A0504', department: 'ECE',   year: '2' },
    { email: 'sneha.reddy24@gmail.com',    password: 'Sneha@2005',        fullName: 'Sneha Reddy',          role: 'student',    courseType: 'full_time',  phone: '9100000005', rollNumber: '23HP1A0505', department: 'EEE',   year: '1' },
    { email: 'arjun.krishna25@gmail.com',  password: 'Arjun@2005',        fullName: 'Arjun Krishna',        role: 'student',    courseType: 'full_time',  phone: '9100000006', rollNumber: '23HP1A0506', department: 'EEE',   year: '1' },
    { email: 'divya.nair26@gmail.com',     password: 'Divya@2005',        fullName: 'Divya Nair',           role: 'student',    courseType: 'full_time',  phone: '9100000007', rollNumber: '23HP1A0507', department: 'DS',    year: '4' },
    { email: 'kiran.patel27@gmail.com',    password: 'Kiran@2005',        fullName: 'Kiran Patel',          role: 'student',    courseType: 'full_time',  phone: '9100000008', rollNumber: '23HP1A0508', department: 'DS',    year: '4' },
    { email: 'meera.iyer28@gmail.com',     password: 'Meera@2005',        fullName: 'Meera Iyer',           role: 'student',    courseType: 'full_time',  phone: '9100000009', rollNumber: '23HP1A0509', department: 'AI/ML', year: '3' },
    { email: 'suresh.babu29@gmail.com',    password: 'Suresh@2005',       fullName: 'Suresh Babu',          role: 'student',    courseType: 'full_time',  phone: '9100000010', rollNumber: '23HP1A0510', department: 'AI/ML', year: '2' },
    { email: 'lakshmi.devi30@gmail.com',   password: 'Lakshmi@2005',      fullName: 'Lakshmi Devi',         role: 'student',    courseType: 'full_time',  phone: '9100000011', rollNumber: '23HP1A0511', department: 'IT',    year: '1' },
    { email: 'vijay.kumar31@gmail.com',    password: 'Vijay@2005',        fullName: 'Vijay Kumar',          role: 'student',    courseType: 'full_time',  phone: '9100000012', rollNumber: '23HP1A0512', department: 'IT',    year: '4' },
    { email: 'pooja.mishra32@gmail.com',   password: 'Pooja@2005',        fullName: 'Pooja Mishra',         role: 'student',    courseType: 'full_time',  phone: '9100000013', rollNumber: '23HP1A0513', department: 'CSE',   year: '3' },
    { email: 'ravi.shankar33@gmail.com',   password: 'Ravi@2005',         fullName: 'Ravi Shankar',         role: 'student',    courseType: 'full_time',  phone: '9100000014', rollNumber: '23HP1A0514', department: 'ECE',   year: '2' },
    { email: 'ananya.das34@gmail.com',     password: 'Ananya@2005',       fullName: 'Ananya Das',           role: 'student',    courseType: 'full_time',  phone: '9100000015', rollNumber: '23HP1A0515', department: 'DS',    year: '2' },
    { email: 'rohit.gupta35@gmail.com',    password: 'Rohit@2005',        fullName: 'Rohit Gupta',          role: 'student',    courseType: 'full_time',  phone: '9100000016', rollNumber: '23HP1A0516', department: 'AI/ML', year: '1' },
    { email: 'kavitha.m36@gmail.com',      password: 'Kavitha@2005',      fullName: 'Kavitha M',            role: 'student',    courseType: 'full_time',  phone: '9100000017', rollNumber: '23HP1A0517', department: 'EEE',   year: '3' },
    { email: 'sanjay.rao37@gmail.com',     password: 'Sanjay@2005',       fullName: 'Sanjay Rao',           role: 'student',    courseType: 'full_time',  phone: '9100000018', rollNumber: '23HP1A0518', department: 'IT',    year: '4' },
    { email: 'deepika.ch38@gmail.com',     password: 'Deepika@2005',      fullName: 'Deepika Ch',           role: 'student',    courseType: 'full_time',  phone: '9100000019', rollNumber: '23HP1A0519', department: 'CSE',   year: '4' },
    { email: 'naveen.reddy39@gmail.com',   password: 'Naveen@2005',       fullName: 'Naveen Reddy',         role: 'student',    courseType: 'full_time',  phone: '9100000020', rollNumber: '23HP1A0520', department: 'ECE',   year: '3' },

    // Intern
    { email: 'swathiraguthu@gmail.com',    password: 'Swathi@2005',       fullName: 'Swathi Raguthu',       role: 'intern',     courseType: 'internship', phone: '9200000001', rollNumber: '23HP1A0521', department: 'CSE',   year: '3' },
];

// Course slug → which student emails are assigned
const courseEnrollments = {
    // Original engineering courses
    'cse':       ['anuraguthu31@gmail.com', 'maheshgutha21@gmail.com', 'priya.sharma22@gmail.com'],
    'ece':       ['rahul.verma23@gmail.com', 'sneha.reddy24@gmail.com', 'anuraguthu31@gmail.com'],
    'ds':        ['arjun.krishna25@gmail.com', 'divya.nair26@gmail.com', 'kiran.patel27@gmail.com'],
    'aiml':      ['meera.iyer28@gmail.com', 'suresh.babu29@gmail.com'],
    'it':        ['lakshmi.devi30@gmail.com', 'vijay.kumar31@gmail.com', 'pooja.mishra32@gmail.com'],
    'mech':      ['ravi.shankar33@gmail.com', 'ananya.das34@gmail.com'],
    'eee':       ['rohit.gupta35@gmail.com', 'kavitha.m36@gmail.com', 'sanjay.rao37@gmail.com'],
    // New skill-based courses
    'coding':    ['anuraguthu31@gmail.com', 'maheshgutha21@gmail.com', 'arjun.krishna25@gmail.com', 'rohit.gupta35@gmail.com'],
    'reasoning': ['priya.sharma22@gmail.com', 'sneha.reddy24@gmail.com', 'meera.iyer28@gmail.com', 'pooja.mishra32@gmail.com'],
    'aptitude':  ['rahul.verma23@gmail.com', 'divya.nair26@gmail.com', 'vijay.kumar31@gmail.com', 'sanjay.rao37@gmail.com'],
};

// Batch sessions per course: morning for first enrolled students, afternoon for the rest
const batchSessionMap = {
    // Original
    'cse':       ['morning', 'morning', 'afternoon'],
    'ece':       ['morning', 'afternoon', 'morning'],
    'ds':        ['morning', 'morning', 'evening'],
    'aiml':      ['morning', 'afternoon'],
    'it':        ['morning', 'morning', 'afternoon'],
    'mech':      ['morning', 'evening'],
    'eee':       ['morning', 'afternoon', 'afternoon'],
    // New
    'coding':    ['morning', 'morning', 'afternoon', 'afternoon'],
    'reasoning': ['morning', 'afternoon', 'morning', 'evening'],
    'aptitude':  ['morning', 'morning', 'afternoon', 'evening'],
};

const seedData = async () => {
    await connectDB();

    try {
        console.log('\n========== STEP 1: Seeding Users ==========');
        const userMap = {}; // email → user doc
        let instructorId = null;
        let adminId = null;

        for (const item of usersToSeed) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(item.password, salt);
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=random&color=fff`;
            const now = new Date();
            const registrationDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const registrationTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            let userObj = await User.findOne({ email: item.email });
            if (userObj) {
                console.log(`  [UPDATE] ${item.email}`);
                userObj.password_hash = passwordHash;
                userObj.full_name = item.fullName;
                userObj.avatar_url = avatarUrl;
                userObj.phone = item.phone;
                await userObj.save();
            } else {
                console.log(`  [CREATE] ${item.email}`);
                userObj = await User.create({
                    email: item.email,
                    password_hash: passwordHash,
                    full_name: item.fullName,
                    avatar_url: avatarUrl,
                    phone: item.phone,
                    registration_date: registrationDate,
                    registration_time: registrationTime
                });
            }

            await Profile.findOneAndUpdate(
                { user_id: userObj._id },
                {
                    user_id: userObj._id,
                    email: item.email,
                    full_name: item.fullName,
                    avatar_url: avatarUrl,
                    mobile_number: item.phone,
                    department: item.department || '',
                    roll_number: item.rollNumber || '',
                    year: item.year || '',
                    course_type: item.courseType,
                    registration_date: registrationDate,
                    registration_time: registrationTime,
                    approval_status: 'approved',
                    updated_at: new Date()
                },
                { upsert: true, returnDocument: 'after' }
            );

            await UserRole.findOneAndUpdate(
                { user_id: userObj._id },
                { user_id: userObj._id, role: item.role, updated_at: new Date() },
                { upsert: true, returnDocument: 'after' }
            );

            userMap[item.email] = userObj;
            if (item.role === 'instructor') instructorId = userObj._id;
            if (item.role === 'admin') adminId = userObj._id;
        }
        console.log(`  ✓ ${usersToSeed.length} users seeded`);

        // ─── STEP 2: Courses ───────────────────────────────────────────────────
        console.log('\n========== STEP 2: Seeding Courses ==========');
        const coursesToSeed = [
            // Original engineering courses
            { slug: 'cse',       title: 'Computer Science and Engineering (CSE)',            desc: 'Explore core computer science, software development, data structures, and algorithms.',                              category: 'Engineering',  color: '#3B82F6' },
            { slug: 'ece',       title: 'Electronics and Communication Engineering (ECE)',   desc: 'Study digital electronics, microprocessors, communication protocols, and signal processing.',                       category: 'Engineering',  color: '#8B5CF6' },
            { slug: 'ds',        title: 'Data Science (DS)',                                 desc: 'Learn data analytics, statistical modeling, machine learning, and data visualization techniques.',                  category: 'Engineering',  color: '#10B981' },
            { slug: 'aiml',      title: 'Artificial Intelligence & Machine Learning (AIML)', desc: 'Master deep learning, neural networks, computer vision, and modern AI architectures.',                             category: 'Engineering',  color: '#F59E0B' },
            { slug: 'it',        title: 'Information Technology (IT)',                       desc: 'Understand database management systems, network infrastructure, cybersecurity, and web technologies.',              category: 'Engineering',  color: '#EF4444' },
            { slug: 'mech',      title: 'Mechanical Engineering (MECH)',                     desc: 'Cover thermodynamics, mechanics of solids, manufacturing processes, and machine design.',                          category: 'Engineering',  color: '#6366F1' },
            { slug: 'eee',       title: 'Electrical and Electronics Engineering (EEE)',      desc: 'Delve into power systems, control machinery, electrical circuits, and power electronics.',                         category: 'Engineering',  color: '#EC4899' },
            // ── NEW skill-based courses ──────────────────────────────────────
            { slug: 'coding',    title: 'Coding & Programming Fundamentals',                 desc: 'Build strong programming foundations covering problem-solving, data structures, algorithms, and hands-on coding challenges across multiple languages.',    category: 'Skill Development', color: '#14B8A6' },
            { slug: 'reasoning', title: 'Logical Reasoning & Critical Thinking',             desc: 'Sharpen analytical thinking with syllogisms, puzzles, blood relations, coding-decoding, series completion, and verbal/non-verbal reasoning techniques.', category: 'Skill Development', color: '#F97316' },
            { slug: 'aptitude',  title: 'Quantitative Aptitude & Problem Solving',           desc: 'Master quantitative aptitude topics including arithmetic, algebra, percentages, profit & loss, time & work, and data interpretation for placement exams.', category: 'Skill Development', color: '#84CC16' },
        ];

        const courseMap = {}; // slug → course doc

        for (const item of coursesToSeed) {
            const courseData = {
                title: item.title,
                slug: item.slug,
                description: item.desc,
                thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600',
                instructor_ids: instructorId ? [instructorId] : [],
                category: item.category,
                price: 0,
                original_price: 19999,
                status: 'published',
                level: 'beginner',
                duration: '4 Months',
                theme_color: item.color,
                is_active: true,
                updated_at: new Date()
            };

            let course = await Course.findOne({ slug: item.slug });
            if (course) {
                console.log(`  [UPDATE] ${item.slug}`);
                await Course.updateOne({ slug: item.slug }, { $set: courseData });
                course = await Course.findOne({ slug: item.slug });
            } else {
                console.log(`  [CREATE] ${item.slug}`);
                course = await Course.create(courseData);
            }
            courseMap[item.slug] = course;
        }
        console.log(`  ✓ ${coursesToSeed.length} courses seeded`);

        // ─── STEP 3: Batches per course ────────────────────────────────────────
        console.log('\n========== STEP 3: Seeding Batches ==========');
        const batchMap = {}; // `${slug}_${session}` → batch doc
        const batchSessions = ['morning', 'afternoon', 'evening'];

        for (const item of coursesToSeed) {
            const course = courseMap[item.slug];

            for (const session of batchSessions) {
                const batchKey = `${item.slug}_${session}`;
                const timeMap = { morning: ['09:00','11:00'], afternoon: ['14:00','16:00'], evening: ['18:00','20:00'] };

                // Derive a readable batch name
                const shortName = item.slug.toUpperCase();
                const sessionLabel = session.charAt(0).toUpperCase() + session.slice(1);

                let batch = await Batch.findOne({ course_id: course._id, batch_type: session });
                if (!batch) {
                    batch = await Batch.create({
                        batch_name: `${shortName} ${sessionLabel} Batch`,
                        course_id: course._id,
                        instructor_id: instructorId,
                        batch_type: session,
                        max_students: 30,
                        start_time: timeMap[session][0],
                        end_time: timeMap[session][1],
                        status: 'approved',
                        processed_by: adminId,
                        processed_at: new Date()
                    });
                    console.log(`  [CREATE] Batch: ${batchKey}`);
                } else {
                    await Batch.updateOne({ _id: batch._id }, {
                        $set: { status: 'approved', instructor_id: instructorId, processed_by: adminId }
                    });
                    console.log(`  [UPDATE] Batch: ${batchKey}`);
                }
                batchMap[batchKey] = batch;
            }
        }
        console.log(`  ✓ Batches seeded for all courses`);

        // ─── STEP 4: Enrollments + Batch Assignments ───────────────────────────
        console.log('\n========== STEP 4: Seeding Enrollments ==========');
        const enrollmentMap = {}; // `${userId}_${courseId}` → enrollment

        for (const [slug, emails] of Object.entries(courseEnrollments)) {
            const course = courseMap[slug];
            const sessions = batchSessionMap[slug];

            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                const student = userMap[email];
                if (!student) { console.log(`  [WARN] Student not found: ${email}`); continue; }

                const session = sessions[i] || 'morning';
                const batch = batchMap[`${slug}_${session}`];
                const key = `${student._id}_${course._id}`;

                let enrollment = await Enrollment.findOne({ user_id: student._id, course_id: course._id });
                if (!enrollment) {
                    enrollment = await Enrollment.create({
                        user_id: student._id,
                        course_id: course._id,
                        status: 'active',
                        progress_percentage: Math.floor(Math.random() * 80) + 5,
                        payment_term: 'full',
                        final_price: 0,
                        requested_batch_type: session,
                        requested_batch_id: batch._id,
                        category: 'approve'
                    });
                    console.log(`  [ENROLL] ${email} → ${slug} (${session})`);
                } else {
                    await Enrollment.updateOne({ _id: enrollment._id }, { $set: { status: 'active' } });
                    console.log(`  [UPDATE] ${email} → ${slug}`);
                }
                enrollmentMap[key] = enrollment;

                try {
                    await StudentBatch.findOneAndUpdate(
                        { student_id: student._id, course_id: course._id },
                        {
                            student_id: student._id,
                            course_id: course._id,
                            batch_id: batch._id,
                            assigned_session: session,
                            assigned_by: adminId
                        },
                        { upsert: true, returnDocument: 'after' }
                    );
                } catch (e) {
                    // Skip duplicate key errors silently
                }
            }
        }
        console.log(`  ✓ Enrollments and batch assignments seeded`);

        // ─── STEP 5: Question Banks ────────────────────────────────────────────
        console.log('\n========== STEP 5: Seeding Question Banks ==========');

        const questionTopics = [
            // Original
            { slug: 'cse',       topic: 'Data Structures & Algorithms' },
            { slug: 'ece',       topic: 'Digital Electronics' },
            { slug: 'ds',        topic: 'Machine Learning Basics' },
            { slug: 'aiml',      topic: 'Neural Networks' },
            { slug: 'it',        topic: 'Database Management' },
            { slug: 'mech',      topic: 'Thermodynamics' },
            { slug: 'eee',       topic: 'Power Systems' },
            // New
            { slug: 'coding',    topic: 'Programming Fundamentals' },
            { slug: 'reasoning', topic: 'Logical Reasoning' },
            { slug: 'aptitude',  topic: 'Quantitative Aptitude' },
        ];

        // Per-course question templates
        const questionTemplateMap = {
            'Data Structures & Algorithms': [
                { q: 'What is the time complexity of binary search?',        opts: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],                                                                  correct: 1 },
                { q: 'Which data structure uses LIFO order?',                opts: ['Queue', 'Stack', 'Tree', 'Graph'],                                                                    correct: 1 },
                { q: 'What does CPU stand for?',                             opts: ['Central Processing Unit', 'Core Processing Unit', 'Central Program Unit', 'Core Program Unit'],      correct: 0 },
                { q: 'What is polymorphism in OOP?',                         opts: ['One class, many forms', 'Many classes, one form', 'Only inheritance', 'Only encapsulation'],         correct: 0 },
                { q: 'Which protocol is used for email?',                    opts: ['HTTP', 'FTP', 'SMTP', 'TCP'],                                                                         correct: 2 },
            ],
            'Digital Electronics': [
                { q: 'What is the output of an AND gate when both inputs are 1?', opts: ['0', '1', 'X', 'Z'],                                                                             correct: 1 },
                { q: 'Which number system uses base 16?',                    opts: ['Binary', 'Octal', 'Decimal', 'Hexadecimal'],                                                          correct: 3 },
                { q: 'What does a flip-flop store?',                         opts: ['1 byte', '1 bit', '4 bits', '1 nibble'],                                                              correct: 1 },
                { q: 'NOR gate is a combination of which gates?',            opts: ['NOT + AND', 'NOT + OR', 'AND + OR', 'NAND + NOT'],                                                   correct: 1 },
                { q: 'What is the binary equivalent of decimal 10?',         opts: ['1010', '1001', '1100', '1110'],                                                                       correct: 0 },
            ],
            'Machine Learning Basics': [
                { q: 'Which algorithm is used for classification problems?', opts: ['Linear Regression', 'Logistic Regression', 'K-Means', 'PCA'],                                       correct: 1 },
                { q: 'What does overfitting mean?',                          opts: ['Model performs well on train but poor on test', 'Model performs well on test', 'Model is underfitted', 'None'], correct: 0 },
                { q: 'Which metric is used for regression?',                 opts: ['Accuracy', 'F1 Score', 'RMSE', 'Precision'],                                                         correct: 2 },
                { q: 'What is a decision tree?',                             opts: ['A sorting algorithm', 'A tree-based classification model', 'A neural network', 'A clustering method'], correct: 1 },
                { q: 'K-Means is a type of?',                                opts: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Deep learning'],           correct: 1 },
            ],
            'Neural Networks': [
                { q: 'What is an activation function?',                      opts: ['A loss function', 'A function that introduces non-linearity', 'An optimizer', 'A weight initializer'], correct: 1 },
                { q: 'Which layer is between input and output in a neural network?', opts: ['Dropout layer', 'Hidden layer', 'Softmax layer', 'Pooling layer'],                           correct: 1 },
                { q: 'What does backpropagation do?',                        opts: ['Feeds data forward', 'Updates weights using gradients', 'Normalizes inputs', 'Reduces overfitting'], correct: 1 },
                { q: 'Which optimizer is widely used in deep learning?',     opts: ['SGD', 'Adam', 'RMSProp', 'All of the above'],                                                        correct: 3 },
                { q: 'CNN is primarily used for?',                           opts: ['Text processing', 'Time series', 'Image recognition', 'Audio processing'],                           correct: 2 },
            ],
            'Database Management': [
                { q: 'What does SQL stand for?',                             opts: ['Structured Query Language', 'Simple Query Language', 'Standard Query Logic', 'Structured Queue Logic'], correct: 0 },
                { q: 'Which command retrieves data from a table?',           opts: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'],                                                               correct: 2 },
                { q: 'What is a primary key?',                               opts: ['A key that allows duplicates', 'A key that uniquely identifies a record', 'A foreign reference', 'An index key'], correct: 1 },
                { q: 'Which JOIN returns all records from both tables?',     opts: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],                                           correct: 3 },
                { q: 'What is normalization in databases?',                  opts: ['Adding redundancy', 'Reducing redundancy and improving integrity', 'Creating indexes', 'Partitioning tables'], correct: 1 },
            ],
            'Thermodynamics': [
                { q: 'What is the first law of thermodynamics?',             opts: ['Energy cannot be created or destroyed', 'Entropy always increases', 'Heat flows from cold to hot', 'Work equals force times distance'], correct: 0 },
                { q: 'Which cycle is used in petrol engines?',               opts: ['Diesel cycle', 'Otto cycle', 'Rankine cycle', 'Brayton cycle'],                                      correct: 1 },
                { q: 'What is the unit of pressure?',                        opts: ['Newton', 'Joule', 'Pascal', 'Watt'],                                                                  correct: 2 },
                { q: 'What is entropy a measure of?',                        opts: ['Temperature', 'Disorder in a system', 'Pressure', 'Volume'],                                         correct: 1 },
                { q: 'Which law states heat flows from hot to cold?',        opts: ['Zeroth law', 'First law', 'Second law', 'Third law'],                                                 correct: 2 },
            ],
            'Power Systems': [
                { q: 'What is the unit of electrical power?',                opts: ['Volt', 'Ampere', 'Watt', 'Ohm'],                                                                     correct: 2 },
                { q: 'What does a transformer do?',                          opts: ['Converts AC to DC', 'Changes voltage levels', 'Stores energy', 'Measures current'],                  correct: 1 },
                { q: 'What is the formula for Ohm\'s Law?',                  opts: ['V = IR', 'P = IV', 'I = PR', 'R = VP'],                                                              correct: 0 },
                { q: 'Which type of current is used in households?',         opts: ['DC', 'AC', 'Pulsating DC', 'None'],                                                                   correct: 1 },
                { q: 'Power factor is the cosine of?',                       opts: ['Voltage angle', 'Phase angle between V and I', 'Current angle', 'Impedance angle'],                 correct: 1 },
            ],

            // ── NEW COURSE QUESTION BANKS ───────────────────────────────────
            'Programming Fundamentals': [
                { q: 'Which keyword is used to define a function in Python?',opts: ['func', 'function', 'def', 'define'],                                                                  correct: 2 },
                { q: 'What is the output of: print(2 ** 3) in Python?',      opts: ['6', '8', '9', '5'],                                                                                  correct: 1 },
                { q: 'Which of these is NOT a programming language?',        opts: ['Python', 'Java', 'HTML', 'C++'],                                                                     correct: 2 },
                { q: 'What does a loop do in programming?',                  opts: ['Terminates the program', 'Repeats a block of code', 'Declares a variable', 'Imports a module'],     correct: 1 },
                { q: 'What is the index of the first element in an array?',  opts: ['1', '-1', '0', 'Depends on language'],                                                               correct: 2 },
                { q: 'Which data type stores True or False?',                opts: ['int', 'string', 'boolean', 'float'],                                                                  correct: 2 },
                { q: 'What does "++i" do in C/C++?',                         opts: ['Post-increments i', 'Pre-increments i', 'Decrements i', 'Does nothing'],                             correct: 1 },
                { q: 'Which symbol is used for single-line comments in Python?', opts: ['/', '//', '#', '--'],                                                                             correct: 2 },
                { q: 'What is recursion?',                                   opts: ['A loop structure', 'A function calling itself', 'An array operation', 'A class method'],             correct: 1 },
                { q: 'Which sorting algorithm has the best average time complexity?', opts: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'],                            correct: 2 },
            ],
            'Logical Reasoning': [
                { q: 'If all roses are flowers and all flowers are plants, then all roses are?', opts: ['Animals', 'Trees', 'Plants', 'None'],                                             correct: 2 },
                { q: 'Find the odd one out: 2, 4, 6, 9, 10',                opts: ['2', '4', '9', '10'],                                                                                  correct: 2 },
                { q: 'If A is the brother of B, B is the sister of C, how is A related to C?', opts: ['Sister', 'Brother', 'Cousin', 'Uncle'],                                           correct: 1 },
                { q: 'Complete the series: 3, 6, 12, 24, ?',               opts: ['36', '48', '30', '42'],                                                                                correct: 1 },
                { q: 'CODING → DPEJOH. What does LOGIC become?',            opts: ['MPHJD', 'MNHJD', 'MPJHD', 'NMPJH'],                                                                  correct: 0 },
                { q: 'A clock shows 3:00. What is the angle between the hands?', opts: ['45°', '60°', '90°', '120°'],                                                                    correct: 2 },
                { q: 'Which of the following is always a logical fallacy?',  opts: ['Modus Ponens', 'Ad Hominem', 'Syllogism', 'Hypothetical Syllogism'],                                 correct: 1 },
                { q: 'If MANGO is coded as 41, how is GRAPE coded?',        opts: ['39', '43', '41', '45'],                                                                                correct: 1 },
                { q: 'Pointing to a photograph, a man says "She is the daughter of my grandfather\'s only son." How is she related to him?', opts: ['Sister', 'Cousin', 'Aunt', 'Mother'], correct: 0 },
                { q: 'What comes next: AZ, BY, CX, DW, ?',                  opts: ['EV', 'EU', 'FV', 'EW'],                                                                               correct: 0 },
            ],
            'Quantitative Aptitude': [
                { q: 'What is 15% of 200?',                                  opts: ['25', '30', '35', '40'],                                                                               correct: 1 },
                { q: 'If a train travels 240 km in 4 hours, what is its speed?', opts: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'],                                                     correct: 2 },
                { q: 'Find the LCM of 12 and 18.',                           opts: ['6', '24', '36', '72'],                                                                                correct: 2 },
                { q: 'A shirt costs ₹500. After 20% discount, what is the price?', opts: ['₹400', '₹380', '₹420', '₹450'],                                                               correct: 0 },
                { q: 'If 5 workers complete a job in 8 days, how many days for 10 workers?', opts: ['16', '4', '8', '2'],                                                                  correct: 1 },
                { q: 'What is the square root of 144?',                      opts: ['11', '12', '13', '14'],                                                                               correct: 1 },
                { q: 'A sum becomes ₹1200 at SI in 2 years at 10% p.a. Find the principal.', opts: ['₹800', '₹900', '₹1000', '₹1100'],                                                  correct: 2 },
                { q: 'Ratio of A:B = 3:5. If B = 25, find A.',              opts: ['10', '12', '15', '18'],                                                                               correct: 2 },
                { q: 'What is the average of 10, 20, 30, 40, 50?',          opts: ['25', '30', '35', '40'],                                                                               correct: 1 },
                { q: 'If a product is sold at 25% profit for ₹500, what is the cost price?', opts: ['₹350', '₹375', '₹400', '₹425'],                                                    correct: 2 },
            ],
        };

        // Fallback generic questions
        const fallbackQuestions = [
            { q: 'What is the time complexity of binary search?',        opts: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],                                                                  correct: 1 },
            { q: 'Which data structure uses LIFO order?',                opts: ['Queue', 'Stack', 'Tree', 'Graph'],                                                                    correct: 1 },
            { q: 'What does CPU stand for?',                             opts: ['Central Processing Unit', 'Core Processing Unit', 'Central Program Unit', 'Core Program Unit'],      correct: 0 },
            { q: 'What is polymorphism in OOP?',                         opts: ['One class, many forms', 'Many classes, one form', 'Only inheritance', 'Only encapsulation'],         correct: 0 },
            { q: 'Which protocol is used for email?',                    opts: ['HTTP', 'FTP', 'SMTP', 'TCP'],                                                                         correct: 2 },
        ];

        const qbMap = {}; // slug → [questionDocs]

        for (const topicItem of questionTopics) {
            const course = courseMap[topicItem.slug];
            const existingCount = await QuestionBank.countDocuments({ topic: topicItem.topic, course_id: course._id });
            if (existingCount > 0) {
                console.log(`  [EXISTS] QB: ${topicItem.topic}`);
                qbMap[topicItem.slug] = await QuestionBank.find({ topic: topicItem.topic, course_id: course._id });
                continue;
            }

            const templates = questionTemplateMap[topicItem.topic] || fallbackQuestions;
            const questions = [];
            for (const tmpl of templates) {
                const q = await QuestionBank.create({
                    topic: topicItem.topic,
                    difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
                    question_text: tmpl.q,
                    options: tmpl.opts.map((text, idx) => ({ text, is_correct: idx === tmpl.correct })),
                    correct_answer: tmpl.opts[tmpl.correct],
                    type: 'multiple_choice',
                    marks: 2,
                    course_id: course._id,
                    approval_status: 'approved',
                    created_by: adminId
                });
                questions.push(q);
            }
            qbMap[topicItem.slug] = questions;
            console.log(`  [CREATE] QB: ${topicItem.topic} (${questions.length} questions)`);
        }
        console.log(`  ✓ Question banks seeded`);

        // ─── STEP 6: Exams per course ──────────────────────────────────────────
        console.log('\n========== STEP 6: Seeding Exams ==========');
        const examMap = {}; // slug → exam doc

        for (const item of coursesToSeed) {
            const course = courseMap[item.slug];
            let exam = await Exam.findOne({ course_id: course._id, exam_type: 'mock' });

            const scheduledDate = new Date();
            scheduledDate.setDate(scheduledDate.getDate() - 7);

            // New skill courses get 10 questions; engineering courses keep 5
            const isSkillCourse = ['coding', 'reasoning', 'aptitude'].includes(item.slug);
            const totalQuestions = isSkillCourse ? 10 : 5;
            const totalMarks = totalQuestions * 2;
            const passingMarks = Math.ceil(totalMarks * 0.6);

            if (!exam) {
                exam = await Exam.create({
                    title: `${item.title} — Week 1 Assessment`,
                    description: `Foundational assessment covering Week 1 topics for ${item.title}.`,
                    exam_type: 'mock',
                    course_id: course._id,
                    duration_minutes: isSkillCourse ? 45 : 30,
                    total_marks: totalMarks,
                    passing_marks: passingMarks,
                    negative_marking: 0,
                    max_attempts: 2,
                    scheduled_date: scheduledDate,
                    shuffle_questions: true,
                    show_results: true,
                    status: 'completed',
                    approval_status: 'approved',
                    total_questions: totalQuestions,
                    topics: [questionTopics.find(q => q.slug === item.slug)?.topic || item.title],
                    created_by: adminId,
                    is_active: true
                });
                console.log(`  [CREATE] Exam: ${exam.title}`);
            } else {
                console.log(`  [EXISTS] Exam for ${item.slug}`);
            }
            examMap[item.slug] = exam;
        }
        console.log(`  ✓ Exams seeded`);

        // ─── STEP 7: Exam Results for enrolled students ────────────────────────
        console.log('\n========== STEP 7: Seeding Exam Results ==========');

        // Scores for original engineering courses (out of 10)
        const scoresByEmail = {
            'anuraguthu31@gmail.com':   [8, 7],
            'maheshgutha21@gmail.com':  [9, 6],
            'priya.sharma22@gmail.com': [7, 8],
            'rahul.verma23@gmail.com':  [6, 9],
            'sneha.reddy24@gmail.com':  [10, 7],
            'arjun.krishna25@gmail.com':[8, 6],
            'divya.nair26@gmail.com':   [9, 8],
            'kiran.patel27@gmail.com':  [7, 7],
            'meera.iyer28@gmail.com':   [10, 9],
            'suresh.babu29@gmail.com':  [6, 8],
            'lakshmi.devi30@gmail.com': [8, 6],
            'vijay.kumar31@gmail.com':  [7, 9],
            'pooja.mishra32@gmail.com': [9, 7],
            'ravi.shankar33@gmail.com': [6, 8],
            'ananya.das34@gmail.com':   [8, 10],
            'rohit.gupta35@gmail.com':  [7, 6],
            'kavitha.m36@gmail.com':    [9, 8],
            'sanjay.rao37@gmail.com':   [8, 7],
        };

        // Scores for new skill courses (out of 20, since 10 questions × 2 marks)
        const skillScoresByEmail = {
            'anuraguthu31@gmail.com':   [16, 14],
            'maheshgutha21@gmail.com':  [18, 12],
            'priya.sharma22@gmail.com': [14, 16],
            'rahul.verma23@gmail.com':  [12, 18],
            'sneha.reddy24@gmail.com':  [20, 14],
            'arjun.krishna25@gmail.com':[16, 12],
            'divya.nair26@gmail.com':   [18, 16],
            'kiran.patel27@gmail.com':  [14, 14],
            'meera.iyer28@gmail.com':   [20, 18],
            'suresh.babu29@gmail.com':  [12, 16],
            'lakshmi.devi30@gmail.com': [16, 12],
            'vijay.kumar31@gmail.com':  [14, 18],
            'pooja.mishra32@gmail.com': [18, 14],
            'ravi.shankar33@gmail.com': [12, 16],
            'ananya.das34@gmail.com':   [16, 20],
            'rohit.gupta35@gmail.com':  [14, 12],
            'kavitha.m36@gmail.com':    [18, 16],
            'sanjay.rao37@gmail.com':   [16, 14],
        };

        const isSkillCourse = (slug) => ['coding', 'reasoning', 'aptitude'].includes(slug);

        for (const [slug, emails] of Object.entries(courseEnrollments)) {
            const course = courseMap[slug];
            const exam = examMap[slug];
            if (!exam) continue;

            const totalMarks = isSkillCourse(slug) ? 20 : 10;

            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                const student = userMap[email];
                if (!student) continue;

                const scoreArr = isSkillCourse(slug)
                    ? (skillScoresByEmail[email] || [14, 12])
                    : (scoresByEmail[email] || [7, 6]);

                const score = scoreArr[i % scoreArr.length];
                const percentage = (score / totalMarks) * 100;

                const existing = await ExamResult.findOne({ student_id: student._id, exam_id: exam._id });
                if (existing) {
                    console.log(`  [EXISTS] Result: ${email} → ${slug}`);
                    continue;
                }

                await ExamResult.create({
                    student_id: student._id,
                    exam_id: exam._id,
                    course_id: course._id,
                    test_title: exam.title,
                    score: score,
                    objective_score: score,
                    total_questions: isSkillCourse(slug) ? 10 : 5,
                    percentage: percentage,
                    grading_status: 'graded',
                    time_spent: Math.floor(Math.random() * 900) + 600,
                    submitted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                });
                console.log(`  [CREATE] Result: ${email} → ${slug} (${score}/${totalMarks})`);

                try {
                    await StudentExamAccess.create({
                        student_id: student._id,
                        exam_id: exam._id,
                        access_type: 'exam',
                        assigned_by: adminId,
                        scheduled_date: exam.scheduled_date,
                        granted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
                    });
                } catch (e) { /* duplicate, skip */ }
            }
        }
        console.log(`  ✓ Exam results seeded`);

        // ─── STEP 8: Leaderboard ───────────────────────────────────────────────
        console.log('\n========== STEP 8: Seeding Leaderboard ==========');

        const studentEmails = usersToSeed.filter(u => u.role === 'student').map(u => u.email);

        const allResults = await ExamResult.find({
            student_id: { $in: studentEmails.map(e => userMap[e]?._id).filter(Boolean) }
        });

        const scoreTotals = {};
        for (const result of allResults) {
            const uid = result.student_id.toString();
            scoreTotals[uid] = (scoreTotals[uid] || 0) + (result.score || 0);
        }

        const sortedStudents = Object.entries(scoreTotals).sort((a, b) => b[1] - a[1]);

        for (let i = 0; i < sortedStudents.length; i++) {
            const [uid, total] = sortedStudents[i];
            const rank = i + 1;
            const badges = [];
            if (rank === 1) badges.push('gold_medal');
            if (rank === 2) badges.push('silver_medal');
            if (rank === 3) badges.push('bronze_medal');
            if (total >= 40) badges.push('high_achiever');
            if (total >= 25) badges.push('consistent');

            await LeaderboardStat.findOneAndUpdate(
                { user_id: uid },
                { user_id: uid, total_score: total, rank, badges, updated_at: new Date() },
                { upsert: true, returnDocument: 'after' }
            );
        }
        console.log(`  ✓ Leaderboard updated for ${sortedStudents.length} students`);

        // ─── SUMMARY ──────────────────────────────────────────────────────────
        console.log('\n========== ✅ SEED COMPLETE ==========');
        console.log(`Users:       ${usersToSeed.length} (3 staff + 20 students + 1 intern)`);
        console.log(`Courses:     ${coursesToSeed.length} (7 engineering + 3 skill-based)`);
        console.log(`Batches:     ${coursesToSeed.length * 3} (morning/afternoon/evening per course)`);
        const totalEnrolled = Object.values(courseEnrollments).reduce((s, arr) => s + arr.length, 0);
        console.log(`Enrollments: ${totalEnrolled}`);
        console.log(`Exams:       ${coursesToSeed.length}`);
        console.log(`Leaderboard: ${sortedStudents.length} entries`);

        console.log('\n📋 NEW COURSES ADDED:');
        console.log('  [coding]    Coding & Programming Fundamentals     → 10 questions, 45 min exam');
        console.log('  [reasoning] Logical Reasoning & Critical Thinking → 10 questions, 45 min exam');
        console.log('  [aptitude]  Quantitative Aptitude & Problem Solving → 10 questions, 45 min exam');

        console.log('\n📋 STUDENT CREDENTIALS:');
        for (const u of usersToSeed.filter(u => u.role === 'student')) {
            console.log(`  ${u.email.padEnd(32)} | ${u.password}`);
        }
        console.log('\n🔑 STAFF CREDENTIALS:');
        for (const u of usersToSeed.filter(u => ['admin','manager','instructor','intern'].includes(u.role))) {
            console.log(`  [${u.role.toUpperCase().padEnd(10)}] ${u.email.padEnd(32)} | ${u.password}`);
        }

    } catch (error) {
        console.error('Error seeding data:', error);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
};

seedData();