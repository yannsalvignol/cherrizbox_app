import { Audio } from 'expo-av';

class AudioManager {
  private activeSounds: Map<string, Audio.Sound> = new Map();
  private currentlyPlaying: string | null = null;

  async loadAudio(id: string, uri: string): Promise<Audio.Sound | null> {
    try {
      // Stop and cleanup any existing audio with this ID
      await this.cleanup(id);

      // Stop currently playing audio (only one audio at a time)
      if (this.currentlyPlaying && this.currentlyPlaying !== id) {
        await this.pause(this.currentlyPlaying);
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }
      );

      this.activeSounds.set(id, sound);
      return sound;
    } catch (error) {
      console.error(`Failed to load audio ${id}:`, error);
      return null;
    }
  }

  async play(id: string): Promise<boolean> {
    try {
      const sound = this.activeSounds.get(id);
      if (!sound) return false;

      // Pause currently playing audio
      if (this.currentlyPlaying && this.currentlyPlaying !== id) {
        await this.pause(this.currentlyPlaying);
      }

      await sound.playAsync();
      this.currentlyPlaying = id;
      return true;
    } catch (error) {
      console.error(`Failed to play audio ${id}:`, error);
      return false;
    }
  }

  async pause(id: string): Promise<boolean> {
    try {
      const sound = this.activeSounds.get(id);
      if (!sound) return false;

      await sound.pauseAsync();
      if (this.currentlyPlaying === id) {
        this.currentlyPlaying = null;
      }
      return true;
    } catch (error) {
      console.error(`Failed to pause audio ${id}:`, error);
      return false;
    }
  }

  async stop(id: string): Promise<boolean> {
    try {
      const sound = this.activeSounds.get(id);
      if (!sound) return false;

      await sound.stopAsync();
      await sound.setPositionAsync(0);
      if (this.currentlyPlaying === id) {
        this.currentlyPlaying = null;
      }
      return true;
    } catch (error) {
      console.error(`Failed to stop audio ${id}:`, error);
      return false;
    }
  }

  async cleanup(id: string): Promise<void> {
    try {
      const sound = this.activeSounds.get(id);
      if (sound) {
        await sound.unloadAsync();
        this.activeSounds.delete(id);
        if (this.currentlyPlaying === id) {
          this.currentlyPlaying = null;
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup audio ${id}:`, error);
    }
  }

  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.activeSounds.keys()).map(id => this.cleanup(id));
    await Promise.allSettled(cleanupPromises);
    this.activeSounds.clear();
    this.currentlyPlaying = null;
  }

  getSound(id: string): Audio.Sound | undefined {
    return this.activeSounds.get(id);
  }

  isPlaying(id: string): boolean {
    return this.currentlyPlaying === id;
  }

  getCurrentlyPlaying(): string | null {
    return this.currentlyPlaying;
  }

  getActiveAudioCount(): number {
    return this.activeSounds.size;
  }
}

export const audioManager = new AudioManager();