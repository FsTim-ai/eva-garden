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
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export type SystemType = 'fish' | 'lobster' | 'hydroponics';

export interface SensorReading {
  id: string;
  value: number;
  unit: string;
  timestamp: any;
  type: 'temperature' | 'ph' | 'water_level' | 'oxygen' | 'humidity';
  system: SystemType;
}

export interface ControlAction {
  id: string;
  status: boolean;
  name: string;
  system: SystemType;
  mode: 'auto' | 'manual';
  lastAction?: any;
}
