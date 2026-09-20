/**
 * SaveManager.js
 * Handles localStorage read/write with Zod validation.
 * Never throws — always falls back to safe defaults on corrupt data.
 */

import { SaveDataSchema, DEFAULT_SAVE, safeParse } from '../schemas/zodSchemas.js';

const STORAGE_KEY = 'mushak-ki-daud-save';

export class SaveManager {
  /**
   * Load save data. Validates with Zod; resets to defaults on failure.
   * @returns {object} Validated save data
   */
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw);
      return safeParse(SaveDataSchema, parsed, DEFAULT_SAVE, 'SaveData');
    } catch (err) {
      console.warn('[SaveManager] Failed to load save data, resetting.', err);
      return { ...DEFAULT_SAVE };
    }
  }

  /**
   * Write save data to localStorage.
   * @param {object} data
   */
  _write(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('[SaveManager] Failed to write save data.', err);
    }
  }

  /**
   * Update the high score if the new score beats the current best.
   * @param {number} score
   */
  setHighScore(score) {
    const data = this.load();
    if (score > data.highScore) {
      data.highScore = score;
      this._write(data);
    }
  }

  /**
   * Accumulate total modaks collected across all sessions.
   * @param {number} count
   */
  addModaks(count) {
    const data = this.load();
    data.totalModaksCollected += count;
    this._write(data);
  }

  /**
   * Record a biome as reached.
   * @param {string} biome
   */
  markBiomeReached(biome) {
    const data = this.load();
    if (!data.biomesReached.includes(biome)) {
      data.biomesReached.push(biome);
      this._write(data);
    }
  }

  /**
   * Update a settings field.
   * @param {string} key
   * @param {*} value
   */
  setSetting(key, value) {
    const data = this.load();
    data.settings[key] = value;
    this._write(data);
  }

  /**
   * Read a single setting by key.
   * @param {string} key
   * @param {*} fallback
   */
  getSetting(key, fallback) {
    const data = this.load();
    return data.settings[key] ?? fallback;
  }

  /**
   * Hard reset all save data to defaults.
   */
  reset() {
    this._write({ ...DEFAULT_SAVE });
  }
}
