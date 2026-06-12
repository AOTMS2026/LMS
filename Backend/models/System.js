const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SystemLogSchema = new Schema({
    log_type: { type: String, required: true }, // audit, error, info
    module: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: Object }, // Flexible JSON
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});
SystemLogSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const SecurityEventSchema = new Schema({
    event_type: { type: String, required: true }, // login_failed, ip_blocked
    ip_address: { type: String },
    details: { type: Object },
    created_at: { type: Date, default: Date.now }
});
SecurityEventSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const LeaderboardStatSchema = new Schema({
    user_id:      { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    total_score:  { type: Number, default: 0, index: true },
    rank:         { type: Number },
    badges:       [String],
    exams_taken:  { type: Number, default: 0 },
    is_verified:  { type: Boolean, default: false },
    verified_by:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    verified_at:  { type: Date, default: null },
    updated_at:   { type: Date, default: Date.now, index: true }
});
LeaderboardStatSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const NotificationSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true }, // enrollment, coupon, system
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Object },
    is_read: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now, index: true }
});
NotificationSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const CouponSchema = new Schema({
    code: { type: String, required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // assigned to specific user
    discounted_price: { type: Number, required: true }, // The price they should pay
    is_used: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
    expires_at: { type: Date }
});
CouponSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });


const AttendanceSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    ip_address: { type: String },
    day: { type: String }, // MON, TUE, etc.
    time: { type: String }, // 14:30:00
    date: { type: String }, // 2026-04-09
});
AttendanceSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const CouponRedemptionSchema = new Schema({
    coupon_id: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    redeemed_at: { type: Date, default: Date.now },
    discounted_price: { type: Number }
});
CouponRedemptionSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const CollegeSchema = new Schema({
    name: { type: String, required: true, unique: true },
    created_at: { type: Date, default: Date.now }
});
CollegeSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

module.exports = {
    SystemLog: mongoose.model('SystemLog', SystemLogSchema),
    SecurityEvent: mongoose.model('SecurityEvent', SecurityEventSchema),
    LeaderboardStat: mongoose.model('LeaderboardStat', LeaderboardStatSchema),
    Notification: mongoose.model('Notification', NotificationSchema),
    Coupon: mongoose.model('Coupon', CouponSchema),
    CouponRedemption: mongoose.model('CouponRedemption', CouponRedemptionSchema),
    Attendance: mongoose.model('Attendance', AttendanceSchema),
    College: mongoose.model('College', CollegeSchema)
};