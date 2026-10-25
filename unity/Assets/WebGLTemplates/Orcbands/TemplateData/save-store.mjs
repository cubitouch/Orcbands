export const SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
const prefix = 'orcbands.save.v1.';
export function envelope(snapshot, name = 'My camp', now = new Date()) {
  if (typeof snapshot === 'string') snapshot = JSON.parse(snapshot);
  if (!snapshot || snapshot.version !== 1 || snapshot.map !== 'forest-2302-v1' || !Array.isArray(snapshot.trees) ||
      !Number.isSafeInteger(snapshot.wood) || snapshot.wood < 0 || !Number.isFinite(snapshot.elapsed))
    throw new Error('This is not a supported Orcbands save.');
  return {format:'orcbands-save', version:1, name:String(name).trim().slice(0,40) || 'My camp', savedAt:now.toISOString(), snapshot};
}
export function decode(text) {
  if (typeof text !== 'string' || text.length > 131072) throw new Error('The save file is too large.');
  const value = JSON.parse(text);
  if (value?.format !== 'orcbands-save' || value.version !== 1 || !Number.isFinite(Date.parse(value.savedAt)) ||
      typeof value.name !== 'string' || value.name.length > 40) throw new Error('This is not a supported Orcbands save.');
  envelope(value.snapshot, value.name);
  return value;
}
export class SaveStore {
  constructor(storage) { this.storage = storage; }
  key(slot) { if (!SLOTS.includes(slot)) throw new Error('Unknown save slot.'); return prefix + slot; }
  read(slot) {
    try { const text = this.storage.getItem(this.key(slot)); return text === null ? {slot,empty:true} : {slot,value:decode(text)}; }
    catch (error) { return {slot,error:error.message}; }
  }
  list() { return SLOTS.map(slot => this.read(slot)); }
  write(slot, value) {
    const text = JSON.stringify(value); decode(text);
    try { this.storage.setItem(this.key(slot), text); }
    catch { throw new Error('Couldn’t save in this browser. Download a save to keep this camp.'); }
    return value;
  }
  remove(slot) { this.storage.removeItem(this.key(slot)); }
}
