const { generateFlexibleSchedule } = require('./flexible-scheduler')

const plan = generateFlexibleSchedule({
  now: new Date('2026-09-01T09:00:00'),
  sequence: 1,
  demand: {
    productCode: 'BEER-01',
    productName: '品类一',
    quantity: 1200,
    deadline: '2026-09-01T18:00:00',
    priority: 'urgent',
    strategy: 'balanced',
    lineMode: 'auto'
  },
  workorders: [
    { id: 101, code: 'WO-20260901-001', productCode: 'BEER-01' },
    { id: 102, code: 'WO-20260901-002', productCode: 'BEER-02' }
  ],
  lines: [
    {
      id: 'line-a',
      name: '柔性灌装线 A',
      enabled: true,
      supportedProducts: ['BEER-01', 'BEER-02'],
      currentProduct: 'BEER-01',
      unitsPerHour: 2400,
      availableAt: '2026-09-01T09:20:00',
      bookedMinutes: 260,
      capacityMinutes: 480,
      changeoverMinutes: 35
    },
    {
      id: 'line-b',
      name: '柔性灌装线 B',
      enabled: true,
      supportedProducts: ['BEER-01', 'BEER-03'],
      currentProduct: 'BEER-03',
      unitsPerHour: 3000,
      availableAt: '2026-09-01T09:05:00',
      bookedMinutes: 330,
      capacityMinutes: 480,
      changeoverMinutes: 40
    },
    {
      id: 'line-c',
      name: '柔性灌装线 C',
      enabled: true,
      supportedProducts: ['BEER-01', 'BEER-04'],
      currentProduct: 'BEER-04',
      unitsPerHour: 2000,
      availableAt: '2026-09-01T10:00:00',
      bookedMinutes: 190,
      capacityMinutes: 480,
      changeoverMinutes: 30
    }
  ]
})

console.log('柔性排产方案生成成功：')
console.table(plan)
