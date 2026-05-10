import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { SensorReading, ControlAction, SystemType, OperationType } from '../types';
import { handleFirestoreError } from '../lib/error-handler';
import { SensorCard } from './SensorCard';
import { ControlToggle } from './ControlToggle';
import { Thermometer, Droplets, Waves, Wind, Fish, Loader2, LogIn, Power, Zap, Github, LayoutDashboard, Settings, Bell, Leaf, Shell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import firebaseConfig from '../../firebase-applet-config.json';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [controls, setControls] = useState<ControlAction[]>([]);
  const [systemId] = useState('rooftop-main');
  const [activeView, setActiveView] = useState<'selection' | SystemType>('selection');

  useEffect(() => {
    const sensorPath = `systems/${systemId}/sensors`;
    const controlPath = `systems/${systemId}/controls`;

    const unsubSensors = onSnapshot(collection(db, sensorPath), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SensorReading));
      setSensors(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, sensorPath));

    const unsubControls = onSnapshot(collection(db, controlPath), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ControlAction));
      setControls(data);
    }, (err) => handleFirestoreError(err, OperationType.LIST, controlPath));

    return () => {
      unsubSensors();
      unsubControls();
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

  const seedData = async () => {
    const sensorPath = `systems/${systemId}/sensors`;
    const controlPath = `systems/${systemId}/controls`;
    
    const initialSensors = [
      { type: 'temperature', value: 27.5, unit: '°C', system: 'fish' },
      { type: 'ph', value: 7.2, unit: 'pH', system: 'fish' },
      { type: 'oxygen', value: 6.8, unit: 'mg/L', system: 'fish' },
      { type: 'water_level', value: 85, unit: '%', system: 'fish' },
      { type: 'temperature', value: 18.2, unit: '°C', system: 'lobster' },
      { type: 'ph', value: 8.1, unit: 'pH', system: 'lobster' },
      { type: 'oxygen', value: 7.5, unit: 'mg/L', system: 'lobster' },
      { type: 'water_level', value: 92, unit: '%', system: 'lobster' },
      { type: 'ph', value: 6.2, unit: 'pH', system: 'hydroponics' },
      { type: 'humidity', value: 65, unit: '%', system: 'hydroponics' },
      { type: 'temperature', value: 24.1, unit: '°C', system: 'hydroponics' },
      { type: 'water_level', value: 45, unit: '%', system: 'hydroponics' },
    ];

    const initialControls = [
      { name: 'Oxygenator', status: true, mode: 'auto', system: 'fish' },
      { name: 'Feeder', status: false, mode: 'auto', system: 'fish' },
      { name: 'Water Filter', status: true, mode: 'auto', system: 'lobster' },
      { name: 'Cooling Pump', status: true, mode: 'manual', system: 'lobster' },
      { name: 'Mist System', status: false, mode: 'auto', system: 'hydroponics' },
      { name: 'UV Supplement', status: true, mode: 'manual', system: 'hydroponics' },
    ];

    try {
      for (const s of initialSensors) {
        await addDoc(collection(db, sensorPath), { ...s, timestamp: Timestamp.now() });
      }
      for (const c of initialControls) {
        await addDoc(collection(db, controlPath), { ...c, lastAction: Timestamp.now() });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, sensorPath);
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

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bio-bg text-bio-accent">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  const [showIoTGuide, setShowIoTGuide] = useState(false);

  const renderIoTGuide = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-bio-card-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={() => setShowIoTGuide(false)}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-[40px] p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Integrasi IoT (ESP32 / WiFi)</h2>
          <button onClick={() => setShowIoTGuide(false)} className="p-2 hover:bg-bio-bg rounded-xl transition-colors">
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
    <div className="max-w-4xl mx-auto py-12">
      <div className="text-center mb-16 relative">
        <h1 className="text-5xl font-bold tracking-tight text-bio-card-dark mb-4">Rooftop Smart Farm</h1>
        <p className="text-bio-muted text-lg uppercase tracking-widest font-bold">Select biological system to monitor</p>
        
        <button 
          onClick={() => setShowIoTGuide(true)}
          className="absolute -top-12 right-0 flex items-center gap-2 px-4 py-2 bg-white border border-bio-border rounded-2xl text-xs font-bold text-bio-accent hover:shadow-md transition-all"
        >
          <Zap size={14} />
          IoT Setup Guide
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
            className="bg-white border-2 border-bio-border p-10 rounded-[48px] flex flex-col items-center shadow-xl hover:border-bio-accent transition-all group"
          >
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white mb-6 shadow-lg", item.color)}>
              {React.createElement(item.icon, { size: 36 })}
            </div>
            <h3 className="text-2xl font-bold text-bio-card-dark mb-2 tracking-tight">{item.label}</h3>
            <p className="text-bio-muted text-sm italic">{item.desc}</p>
          </motion.button>
        ))}
      </div>

      {sensors.length === 0 && (
        <div className="mt-16 text-center">
          <button 
            onClick={seedData} 
            className="px-8 py-3 bg-bio-accent text-white rounded-full font-bold shadow-lg hover:shadow-bio-accent/20 transition-all"
          >
            INITIALIZE NODES
          </button>
        </div>
      )}
    </div>
  );

  const renderDashboard = (type: SystemType) => {
    const sysSensors = sensors.filter(s => s.system === type);
    const sysControls = controls.filter(c => c.system === type);
    const config = {
      fish: { label: 'Fish Aquaculture', icon: Fish, color: 'bg-blue-500' },
      lobster: { label: 'Lobster Habitat', icon: Shell, color: 'bg-orange-500' },
      hydroponics: { label: 'Hydroponics Unit', icon: Leaf, color: 'bg-green-500' },
    }[type];

    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setActiveView('selection')}
            className="p-3 bg-white border border-bio-border rounded-2xl text-bio-muted hover:text-bio-accent transition-colors"
          >
            <LayoutDashboard size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className={cn("w-1.5 h-10 rounded-full", config.color)} />
            <h2 className="text-3xl font-bold tracking-tight">{config.label}</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {sysSensors.map(s => (
              <SensorCard 
                key={s.id}
                label={s.type.replace('_', ' ')}
                value={s.value}
                unit={s.unit}
                icon={getSystemIcon(s.type)}
                trend={Math.random() > 0.5 ? 'up' : 'stable'}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="bg-white rounded-[40px] p-8 border border-bio-border shadow-sm">
           <h3 className="text-sm font-bold uppercase tracking-widest text-bio-muted mb-6">Automation Controls</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bio-bg p-6 lg:p-10 text-bio-text">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs text-bio-muted uppercase tracking-widest font-bold">
              <span className="w-2 h-2 rounded-full bg-bio-accent animate-pulse" />
              SYSTEM NODE-OS ONLINE // {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="bg-white px-5 py-2.5 rounded-2xl border border-bio-border shadow-sm text-xs font-mono">
            IP: 192.168.1.100 <span className="text-bio-muted ml-2">ROOFTOP-RT</span>
          </div>
        </header>

        <main>
          {activeView === 'selection' ? renderSelection() : renderDashboard(activeView)}
        </main>

        <AnimatePresence>
          {showIoTGuide && renderIoTGuide()}
        </AnimatePresence>

        <footer className="py-10 text-center opacity-40">
           <p className="text-[9px] font-bold uppercase tracking-[0.4em]">
             Bento OS • Real-time Urban Farming
           </p>
        </footer>
      </div>
    </div>
  );
}

const CloudFog = Wind;
