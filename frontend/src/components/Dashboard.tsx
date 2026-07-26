import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SensorReading, ControlAction, SystemType, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { SensorCard } from './SensorCard';
import { ControlToggle } from './ControlToggle';
import { Thermometer, Droplets, Waves, Wind, CloudFog, Fish, Power, Zap, LayoutDashboard, Leaf, Shell, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import firebaseConfig from '../../firebase-applet-config.json';

// Set VITE_BACKEND_URL to point elsewhere (e.g. local backend testing);
// defaults to the deployed instance so the download button works out of the box.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)
  ?? 'https://eva-garden-production.up.railway.app';

function formatReadingTime(timestamp: Timestamp | undefined): string {
  if (!timestamp) return '—';
  return timestamp.toDate().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
}

type SensorType = SensorReading['type'];

const SENSOR_UNITS: Record<SensorType, string> = {
  temperature: '°C',
  ph: 'pH',
  water_level: '%',
  oxygen: 'mg/L',
  humidity: '%',
};

// Sensor slots each system is expected to report. A slot with no reading
// yet (no ESP32 has sent that type) just displays as 0, not seeded/dummy data.
const SYSTEM_SENSOR_TYPES: Record<SystemType, SensorType[]> = {
  fish: ['temperature', 'ph', 'oxygen', 'water_level'],
  lobster: ['temperature', 'ph', 'oxygen', 'water_level'],
  hydroponics: ['temperature', 'ph', 'humidity', 'water_level'],
};

export default function Dashboard() {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [controls, setControls] = useState<ControlAction[]>([]);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [systemId] = useState('rooftop-main');
  const [activeView, setActiveView] = useState<'selection' | SystemType>('selection');
  const [now, setNow] = useState(() => new Date());
  const [showIoTGuide, setShowIoTGuide] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const sensorPath = `systems/${systemId}/sensors`;
    const controlPath = `systems/${systemId}/controls`;
    const historyPath = `systems/${systemId}/history`;

    const unsubSensors = onSnapshot(collection(db, sensorPath), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SensorReading));
      setSensors(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, sensorPath));

    const unsubControls = onSnapshot(collection(db, controlPath), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ControlAction));
      setControls(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, controlPath));

    // Ordered by time only (not filtered by system) so this doesn't need a
    // Firestore composite index; filtered down per-system when rendering.
    const historyQuery = query(collection(db, historyPath), orderBy('timestamp', 'desc'), limit(50));
    const unsubHistory = onSnapshot(historyQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SensorReading));
      setHistory(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, historyPath));

    return () => {
      unsubSensors();
      unsubControls();
      unsubHistory();
    };
  }, [systemId]);

  const toggleControl = async (control: ControlAction) => {
    if (control.mode === 'auto') return;
    const path = `systems/${systemId}/controls/${control.id}`;
    try {
      await updateDoc(doc(db, path), {
        status: !control.status,
        lastAction: Timestamp.now()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const toggleMode = async (control: ControlAction) => {
    const path = `systems/${systemId}/controls/${control.id}`;
    try {
      await updateDoc(doc(db, path), {
        mode: control.mode === 'auto' ? 'manual' : 'auto'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const getSystemIcon = (type: string) => {
    switch(type) {
      case 'temperature': return Thermometer;
      case 'ph': return Droplets;
      case 'water_level': return Waves;
      case 'oxygen': return Wind;
      case 'humidity': return CloudFog;
      default: return Zap;
    }
  };

  const renderIoTGuide = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-bio-card-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={() => setShowIoTGuide(false)}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-3xl sm:rounded-[40px] p-5 sm:p-8 max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-4 mb-6">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Integrasi IoT (ESP32 / WiFi)</h2>
          <button onClick={() => setShowIoTGuide(false)} className="p-2 hover:bg-bio-bg rounded-xl transition-colors shrink-0">
            <Power className="rotate-45 text-bio-muted" size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-bio-accent mb-2">1. Firebase Credentials</h3>
            <div className="bg-bio-bg p-4 rounded-2xl font-mono text-xs space-y-1">
              <p><span className="text-bio-muted">Project ID:</span> {firebaseConfig.projectId}</p>
              <p><span className="text-bio-muted">Database ID:</span> {firebaseConfig.firestoreDatabaseId}</p>
              <p><span className="text-bio-muted">API Key:</span> {firebaseConfig.apiKey}</p>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-bio-accent mb-2">2. Data Path (Endpoint)</h3>
            <p className="text-sm text-bio-muted mb-2">Kirim data sensor (suhu, pH, dll) ke koleksi berikut:</p>
            <div className="bg-bio-bg p-3 rounded-xl font-mono text-[10px]">
              systems/rooftop-main/sensors/[sensor_id]
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-widest text-bio-accent mb-2">3. Contoh Struktur Data (JSON)</h3>
            <pre className="bg-bio-bg p-4 rounded-xl font-mono text-[10px] overflow-x-auto ring-1 ring-bio-border">
{`{
  "value": 28.5,
  "unit": "°C",
  "type": "temperature",
  "system": "fish",
  "timestamp": { ".sv": "timestamp" } 
}`}
            </pre>
            <p className="text-[10px] text-bio-muted mt-2 italic">* Gunakan server timestamp (.sv) untuk keakuratan data.</p>
          </section>

          <div className="pt-6 border-t border-bio-border flex justify-end">
            <button 
              onClick={() => setShowIoTGuide(false)}
              className="px-6 py-2 bg-bio-accent text-white rounded-full font-bold text-sm"
            >
              Mengerti
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  const renderSelection = () => (
    <div className="max-w-4xl mx-auto py-6 sm:py-12">
      <div className="text-center mb-10 sm:mb-16 relative">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-bio-card-dark mb-4">Rooftop Smart Farm</h1>
        <p className="text-bio-muted text-sm sm:text-lg uppercase tracking-widest font-bold">Select biological system to monitor</p>

        <button
          onClick={() => setShowIoTGuide(true)}
          className="mt-6 md:mt-0 mx-auto md:mx-0 md:absolute md:-top-12 md:right-0 w-fit flex items-center gap-2 px-4 py-2 bg-white border border-bio-border rounded-2xl text-xs font-bold text-bio-accent hover:shadow-md transition-all"
        >
          <Zap size={14} />
          IoT Setup Guide
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        {[
          { id: 'fish', label: 'Fish Tank', icon: Fish, color: 'bg-blue-500', desc: 'Aquaculture system' },
          { id: 'lobster', label: 'Lobster Farm', icon: Shell, color: 'bg-orange-500', desc: 'Crustacean habitat' },
          { id: 'hydroponics', label: 'Hydroponics', icon: Leaf, color: 'bg-green-500', desc: 'Vegetable vegetable' },
        ].map(item => (
          <motion.button
            key={item.id}
            whileHover={{ y: -10, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView(item.id as SystemType)}
            className="bg-white border-2 border-bio-border p-6 sm:p-8 md:p-10 rounded-4xl sm:rounded-[48px] flex flex-col items-center shadow-xl hover:border-bio-accent transition-all group"
          >
            <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center text-white mb-4 sm:mb-6 shadow-lg", item.color)}>
              {React.createElement(item.icon, { size: 32 })}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-bio-card-dark mb-2 tracking-tight">{item.label}</h3>
            <p className="text-bio-muted text-sm italic">{item.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const renderDashboard = (type: SystemType) => {
    const sysSensors = SYSTEM_SENSOR_TYPES[type].map(sensorType => {
      const reading = sensors.find(s => s.system === type && s.type === sensorType);
      return {
        type: sensorType,
        value: reading?.value ?? 0,
        unit: reading?.unit ?? SENSOR_UNITS[sensorType],
      };
    });
    const sysControls = controls.filter(c => c.system === type);
    const sysHistory = history.filter(h => h.system === type);
    const config = {
      fish: { label: 'Fish Aquaculture', icon: Fish, color: 'bg-blue-500' },
      lobster: { label: 'Lobster Habitat', icon: Shell, color: 'bg-orange-500' },
      hydroponics: { label: 'Hydroponics Unit', icon: Leaf, color: 'bg-green-500' },
    }[type];

    return (
      <div className="flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <button
            onClick={() => setActiveView('selection')}
            className="p-2.5 sm:p-3 bg-white border border-bio-border rounded-2xl text-bio-muted hover:text-bio-accent transition-colors"
          >
            <LayoutDashboard size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className={cn("w-1.5 h-8 sm:h-10 rounded-full", config.color)} />
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">{config.label}</h2>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <AnimatePresence>
            {sysSensors.map(s => (
              <SensorCard
                key={s.type}
                label={s.type.replace('_', ' ')}
                value={s.value}
                unit={s.unit}
                icon={getSystemIcon(s.type)}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="bg-white rounded-[28px] sm:rounded-[40px] p-5 sm:p-6 md:p-8 border border-bio-border shadow-sm">
           <h3 className="text-sm font-bold uppercase tracking-widest text-bio-muted mb-4 sm:mb-6">Automation Controls</h3>
           {sysControls.length === 0 ? (
             <p className="text-sm text-bio-muted italic">Belum ada perangkat kontrol untuk sistem ini.</p>
           ) : (
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
               {sysControls.map(c => (
                  <ControlToggle
                    key={c.id}
                    label={c.name}
                    isOn={c.status}
                    mode={c.mode}
                    onToggle={() => toggleControl(c)}
                    onModeToggle={() => toggleMode(c)}
                  />
               ))}
             </div>
           )}
        </div>

        <div className="bg-white rounded-[28px] sm:rounded-[40px] p-5 sm:p-6 md:p-8 border border-bio-border shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4 sm:mb-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-bio-muted">Riwayat Data IoT (ESP32)</h3>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-bio-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-bio-accent animate-pulse" />
              Live
            </span>
          </div>
          {sysHistory.length === 0 ? (
            <p className="text-sm text-bio-muted italic">Belum ada data masuk dari sensor IoT untuk sistem ini.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {sysHistory.map(h => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 rounded-2xl bg-bio-bg text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {React.createElement(getSystemIcon(h.type), { size: 14, className: 'text-bio-accent shrink-0' })}
                    <span className="font-bold uppercase text-xs tracking-wide truncate">{h.type.replace('_', ' ')}</span>
                  </div>
                  <span className="font-semibold mono-data shrink-0">{h.value} {h.unit}</span>
                  <span className="text-bio-muted text-xs shrink-0">{formatReadingTime(h.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bio-bg p-4 sm:p-6 lg:p-10 text-bio-text">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-bio-muted uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-bio-accent animate-pulse shrink-0" />
              SYSTEM NODE-OS ONLINE // {now.toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`${BACKEND_URL}/api/export`}
              className="flex items-center gap-2 bg-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-bio-border shadow-sm text-[10px] sm:text-xs font-bold text-bio-accent hover:shadow-md transition-all"
            >
              <Download size={14} />
              Excel Log
            </a>
            <div className="bg-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-bio-border shadow-sm text-[10px] sm:text-xs font-mono">
              IP: 192.168.1.100 <span className="text-bio-muted ml-2">ROOFTOP-RT</span>
            </div>
          </div>
        </header>

        <main>
          {activeView === 'selection' ? renderSelection() : renderDashboard(activeView)}
        </main>

        <AnimatePresence>
          {showIoTGuide && renderIoTGuide()}
        </AnimatePresence>

        <footer className="py-6 sm:py-10 text-center opacity-40">
           <p className="text-[9px] font-bold uppercase tracking-[0.4em]">
             Bento OS • Real-time Urban Farming
           </p>
        </footer>
      </div>
    </div>
  );
}
