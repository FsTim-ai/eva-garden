import type { Timestamp } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export type SystemType = 'fish' | 'lobster' | 'hydroponics';

export interface SensorReading {
  id: string;
  value: number;
  unit: string;
  timestamp: Timestamp;
  type: 'temperature' | 'ph' | 'water_level' | 'oxygen' | 'humidity';
  system: SystemType;
}

export interface ControlAction {
  id: string;
  status: boolean;
  name: string;
  system: SystemType;
  mode: 'auto' | 'manual';
  lastAction?: Timestamp;
}
