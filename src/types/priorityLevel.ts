export enum PriorityLevel {
  MIN = 'Min', // 0th percentile
  LOW = 'Low', // 25th percentile
  MEDIUM = 'Medium', // 50th percentile
  HIGH = 'High', // 75th percentile
  VERY_HIGH = 'VeryHigh', // 95th percentile
  // labelled unsafe to prevent people from using and draining their funds by accident
  UNSAFE_MAX = 'UnsafeMax', // 100th percentile
  DEFAULT = 'Default', // 50th percentile
}
