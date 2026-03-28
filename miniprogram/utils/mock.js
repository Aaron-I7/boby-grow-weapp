// Mock data
var now = new Date().toISOString()
var today = new Date().toISOString().slice(0, 10)

var family = {
  _id: 'family_001',
  name: 'Demo Family',
  creatorOpenId: 'oMock001',
  dailyPointLimit: 500,
  inviteCode: 'FK8M3N',
  createdAt: now
}

var users = [
  {
    _id: 'user_001',
    openId: 'oMock001',
    familyId: 'family_001',
    role: 'admin',
    nickname: 'Dad',
    identity: 'dad',
    gender: 'male',
    avatarKey: 'adult_male_01',
    avatarUrl: '/images/png/avatar/adult/adult_male_01.png',
    createdAt: now
  },
  {
    _id: 'user_002',
    openId: 'oMock002',
    familyId: 'family_001',
    role: 'coadmin',
    nickname: 'Mom',
    identity: 'mom',
    gender: 'female',
    avatarKey: 'adult_female_01',
    avatarUrl: '/images/png/avatar/adult/adult_female_01.png',
    createdAt: now
  }
]

var children = [
  {
    _id: 'child_001',
    familyId: 'family_001',
    nickname: 'Tom',
    age: 7,
    gender: 'male',
    avatarKey: 'child_male_01',
    avatarUrl: '/images/png/avatar/child/child_male_01.png',
    avatarIndex: 0,
    totalPoints: 1500,
    currentPoints: 1500,
    level: 3,
    verifyCode: '888666',
    bindOpenId: null,
    status: 'active',
    createdAt: now
  },
  {
    _id: 'child_002',
    familyId: 'family_001',
    nickname: 'Lily',
    age: 5,
    gender: 'female',
    avatarKey: 'child_female_01',
    avatarUrl: '/images/png/avatar/child/child_female_01.png',
    avatarIndex: 1,
    totalPoints: 820,
    currentPoints: 820,
    level: 2,
    verifyCode: '123456',
    bindOpenId: null,
    status: 'active',
    createdAt: now
  }
]

var rules = [
  { _id: 'rule_001', familyId: 'family_001', category: 'habit', name: 'Brush Teeth', points: 10, dailyLimit: 2, frequency: 'daily', enabled: true, confirmedByChild: true, createdBy: 'user_001', createdAt: now },
  { _id: 'rule_002', familyId: 'family_001', category: 'study', name: 'Read 20 Min', points: 20, dailyLimit: 1, frequency: 'daily', enabled: true, confirmedByChild: true, createdBy: 'user_001', createdAt: now },
  { _id: 'rule_003', familyId: 'family_001', category: 'chore', name: 'Clean Toys', points: 15, dailyLimit: 1, frequency: 'daily', enabled: true, confirmedByChild: false, createdBy: 'user_001', createdAt: now },
  { _id: 'rule_004', familyId: 'family_001', category: 'virtue', name: 'Share Actively', points: 25, dailyLimit: 1, frequency: 'daily', enabled: true, confirmedByChild: true, createdBy: 'user_001', createdAt: now },
  { _id: 'rule_005', familyId: 'family_001', category: 'study', name: 'Finish Homework', points: 30, dailyLimit: 1, frequency: 'daily', enabled: false, confirmedByChild: false, createdBy: 'user_001', createdAt: now }
]

var tasks = [
  { _id: 'task_001', ruleId: 'rule_001', familyId: 'family_001', childId: 'child_001', date: today, status: 'completed', completedBy: 'user_001', completedAt: '2026-03-26T08:20:00Z', completedDateKey: '2026-03-26', auditStatus: 'none', auditNote: '', points: 10, createdAt: now, ruleName: 'Brush Teeth', category: 'habit' },
  { _id: 'task_002', ruleId: 'rule_002', familyId: 'family_001', childId: 'child_001', date: today, status: 'pending', completedBy: '', auditStatus: 'none', auditNote: '', points: 20, createdAt: now, ruleName: 'Read 20 Min', category: 'study' },
  { _id: 'task_003', ruleId: 'rule_003', familyId: 'family_001', childId: 'child_001', date: today, status: 'pending', completedBy: '', auditStatus: 'pending', auditNote: '', points: 15, createdAt: now, ruleName: 'Clean Toys', category: 'chore' },
  { _id: 'task_004', ruleId: 'rule_004', familyId: 'family_001', childId: 'child_001', date: today, status: 'completed', completedBy: 'user_001', completedAt: '2026-03-26T18:10:00Z', completedDateKey: '2026-03-26', auditStatus: 'approved', auditNote: '', points: 25, createdAt: now, ruleName: 'Share Actively', category: 'virtue' },
  { _id: 'task_005', ruleId: 'rule_001', familyId: 'family_001', childId: 'child_001', date: today, status: 'pending', completedBy: '', auditStatus: 'none', auditNote: '', points: 10, createdAt: now, ruleName: 'Brush Teeth', category: 'habit' },
  { _id: 'task_006', ruleId: 'rule_002', familyId: 'family_001', childId: 'child_001', date: '2026-03-25', status: 'completed', completedBy: 'user_001', completedAt: '2026-03-25T19:12:00Z', completedDateKey: '2026-03-25', auditStatus: 'approved', auditNote: '', points: 20, createdAt: '2026-03-25T18:30:00Z', ruleName: 'Read 20 Min', category: 'study' },
  { _id: 'task_007', ruleId: 'rule_003', familyId: 'family_001', childId: 'child_001', date: '2026-03-24', status: 'completed', completedBy: 'user_001', completedAt: '2026-03-24T17:30:00Z', completedDateKey: '2026-03-24', auditStatus: 'approved', auditNote: '', points: 15, createdAt: '2026-03-24T16:00:00Z', ruleName: 'Clean Toys', category: 'chore' },
  { _id: 'task_008', ruleId: 'rule_004', familyId: 'family_001', childId: 'child_001', date: '2026-03-23', status: 'completed', completedBy: 'user_001', completedAt: '2026-03-23T11:45:00Z', completedDateKey: '2026-03-23', auditStatus: 'approved', auditNote: '', points: 25, createdAt: '2026-03-23T11:00:00Z', ruleName: 'Share Actively', category: 'virtue' },
  { _id: 'task_009', ruleId: 'rule_001', familyId: 'family_001', childId: 'child_001', date: '2026-03-22', status: 'completed', completedBy: 'user_001', completedAt: '2026-03-22T08:10:00Z', completedDateKey: '2026-03-22', auditStatus: 'none', auditNote: '', points: 10, createdAt: '2026-03-22T08:00:00Z', ruleName: 'Brush Teeth', category: 'habit' },
  { _id: 'task_010', ruleId: 'rule_002', familyId: 'family_001', childId: 'child_002', date: '2026-03-25', status: 'completed', completedBy: 'user_001', completedAt: '2026-03-25T10:30:00Z', completedDateKey: '2026-03-25', auditStatus: 'approved', auditNote: '', points: 20, createdAt: '2026-03-25T10:00:00Z', ruleName: 'Read 20 Min', category: 'study' }
]

var pointRecords = [
  { _id: 'pr_001', familyId: 'family_001', childId: 'child_001', type: 'task', amount: 10, balance: 1510, taskId: 'task_001', note: 'Brush Teeth', operatorId: 'user_001', createdAt: '2026-03-24T08:00:00Z' },
  { _id: 'pr_002', familyId: 'family_001', childId: 'child_001', type: 'task', amount: 20, balance: 1530, taskId: '', note: 'Read 20 Min', operatorId: 'user_001', createdAt: '2026-03-23T19:00:00Z' },
  { _id: 'pr_003', familyId: 'family_001', childId: 'child_001', type: 'redeem', amount: -50, balance: 1480, taskId: '', note: 'Redeem: Dessert', operatorId: '', createdAt: '2026-03-23T12:00:00Z' },
  { _id: 'pr_004', familyId: 'family_001', childId: 'child_001', type: 'task', amount: 15, balance: 1495, taskId: '', note: 'Clean Toys', operatorId: 'user_001', createdAt: '2026-03-22T17:00:00Z' },
  { _id: 'pr_005', familyId: 'family_001', childId: 'child_001', type: 'manual', amount: 100, balance: 1595, taskId: '', note: 'Weekly Bonus', operatorId: 'user_001', createdAt: '2026-03-21T10:00:00Z' }
]

var rewards = [
  { _id: 'reward_001', familyId: 'family_001', name: 'Park Time', category: 'companion', cost: 500, redeemLimit: 1, iconIndex: 0, enabled: true, createdAt: now },
  { _id: 'reward_002', familyId: 'family_001', name: 'New Toy', category: 'physical', cost: 1200, redeemLimit: 1, iconIndex: 1, enabled: true, createdAt: now },
  { _id: 'reward_003', familyId: 'family_001', name: 'Extra 30 Min Play', category: 'privilege', cost: 300, redeemLimit: 2, enabled: true, createdAt: now, iconIndex: 2 },
  { _id: 'reward_004', familyId: 'family_001', name: 'Amusement Park Day', category: 'companion', cost: 5000, redeemLimit: 1, iconIndex: 3, enabled: true, createdAt: now }
]

var rewardRequests = [
  { _id: 'rr_001', familyId: 'family_001', childId: 'child_001', rewardId: 'reward_003', rewardName: 'Extra 30 Min Play', cost: 300, status: 'pending', auditNote: '', createdAt: now },
  { _id: 'rr_002', familyId: 'family_001', childId: 'child_001', rewardId: 'reward_001', rewardName: 'Park Time', cost: 500, status: 'approved', auditNote: '', createdAt: '2026-03-20T10:00:00Z' }
]

var wishRequests = [
  { _id: 'wr_001', familyId: 'family_001', childId: 'child_001', name: 'Soccer Ball', iconIndex: 0, suggestedPoints: 800, status: 'pending', createdAt: now },
  { _id: 'wr_002', familyId: 'family_001', childId: 'child_001', name: 'Ice Cream', iconIndex: 5, suggestedPoints: null, status: 'approved', createdAt: '2026-03-20T10:00:00Z' }
]

var weeklyTrend = [
  { day: 'Mon', points: 40 },
  { day: 'Tue', points: 65 },
  { day: 'Wed', points: 35 },
  { day: 'Thu', points: 85 },
  { day: 'Fri', points: 50 },
  { day: 'Sat', points: 95 },
  { day: 'Sun', points: 60 }
]

var inviteTickets = []

module.exports = {
  family: family,
  users: users,
  children: children,
  rules: rules,
  tasks: tasks,
  pointRecords: pointRecords,
  rewards: rewards,
  rewardRequests: rewardRequests,
  wishRequests: wishRequests,
  weeklyTrend: weeklyTrend,
  inviteTickets: inviteTickets
}
