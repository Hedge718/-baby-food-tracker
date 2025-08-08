// src/context/AllergyContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'allergyProfiles';
const KEY_SELECTED = 'allergySelected';

const AllergyContext = createContext(null);

export function AllergyProvider({ children }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(KEY) || '[]');
      const sel = localStorage.getItem(KEY_SELECTED) || null;
      setProfiles(Array.isArray(p) ? p : []);
      setSelectedId(sel);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(profiles));
  }, [profiles]);
  useEffect(() => {
    if (selectedId) localStorage.setItem(KEY_SELECTED, selectedId);
    else localStorage.removeItem(KEY_SELECTED);
  }, [selectedId]);

  const current = useMemo(() => profiles.find(p => p.id === selectedId) || null, [profiles, selectedId]);

  const addProfile = (name, data) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const p = { id, name, ...data };
    setProfiles(prev => [p, ...prev]);
    setSelectedId(id);
  };
  const updateProfile = (id, patch) => setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  const deleteProfile = (id) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <AllergyContext.Provider value={{ profiles, current, selectedId, setSelectedId, addProfile, updateProfile, deleteProfile }}>
      {children}
    </AllergyContext.Provider>
  );
}

export function useAllergyProfiles() {
  return useContext(AllergyContext);
}
