/**
 * Well-known desktop applications that can be detected on the system and
 * used with Discord Rich Presence (RPC-only, no game installation needed).
 *
 * Only applications that can actually be used on Discord (with a valid
 * official Discord application ID or configurable ID) are included here.
 */
export interface KnownApp {
  key: string;
  name: string;
  aliases: string[];
  /** Official Discord application ID, or custom configured ID. */
  discordAppId: string;
  /** 'listening' renders a music-style presence (Spotify). */
  presence: 'playing' | 'listening';
  /** Enables the "now playing" track lookup via the backend. */
  spotify?: boolean;
  hints: {
    /** Executable names looked up in PATH and well-known bin directories. */
    binaries: string[];
    /** Absolute path templates; ~ and %ENV% are expanded by the backend. */
    paths: string[];
  };
}

export const KNOWN_APPS: KnownApp[] = [
  {
    key: 'spotify',
    name: 'Spotify',
    aliases: ['spotify', 'music'],
    // Default Discord application ID for Spotify RPC, customizable in Settings
    discordAppId: '1021481123471183882',
    presence: 'listening',
    spotify: true,
    hints: {
      binaries: ['spotify', 'spotify.exe', 'com.spotify.Client'],
      paths: [
        '%APPDATA%/Spotify/Spotify.exe',
        '/Applications/Spotify.app',
        '~/Applications/Spotify.app',
        '/var/lib/snapd/snap/bin/spotify',
        '~/.local/share/spotify-launcher/install/usr/bin/spotify'
      ]
    }
  },
  {
    key: 'zoom',
    name: 'Zoom',
    aliases: ['zoom', 'zoom.us', 'meetings'],
    discordAppId: '1440138072573612183',
    presence: 'playing',
    hints: {
      binaries: ['zoom', 'Zoom.exe', 'us.zoom.Zoom'],
      paths: ['%APPDATA%/Zoom/bin/Zoom.exe', '/Applications/zoom.us.app']
    }
  },
  {
    key: 'brave',
    name: 'Brave',
    aliases: ['brave', 'browser'],
    discordAppId: '1441990521521176687',
    presence: 'playing',
    hints: {
      binaries: ['brave', 'brave-browser', 'brave.exe', 'com.brave.Browser'],
      paths: [
        '%PROGRAMFILES%/BraveSoftware/Brave-Browser/Application/brave.exe',
        '%LOCALAPPDATA%/BraveSoftware/Brave-Browser/Application/brave.exe',
        '/Applications/Brave Browser.app'
      ]
    }
  },
  {
    key: 'steam',
    name: 'Steam',
    aliases: ['steam', 'valve'],
    discordAppId: '1441992353979170936',
    presence: 'playing',
    hints: {
      binaries: ['steam', 'steam.exe', 'com.valvesoftware.Steam'],
      paths: [
        '%PROGRAMFILES(X86)%/Steam/steam.exe',
        '/Applications/Steam.app',
        '~/.steam/steam'
      ]
    }
  },
  {
    key: 'firefox',
    name: 'Firefox',
    aliases: ['firefox', 'mozilla', 'browser'],
    discordAppId: '1442729602559643668',
    presence: 'playing',
    hints: {
      binaries: ['firefox', 'firefox.exe', 'org.mozilla.firefox'],
      paths: [
        '%PROGRAMFILES%/Mozilla Firefox/firefox.exe',
        '%LOCALAPPDATA%/Mozilla Firefox/firefox.exe',
        '/Applications/Firefox.app'
      ]
    }
  },
  {
    key: 'obsidian',
    name: 'Obsidian',
    aliases: ['obsidian', 'notes'],
    discordAppId: '1441991819620646994',
    presence: 'playing',
    hints: {
      binaries: ['obsidian', 'Obsidian.exe', 'md.obsidian.Obsidian'],
      paths: [
        '%LOCALAPPDATA%/Obsidian/Obsidian.exe',
        '/Applications/Obsidian.app'
      ]
    }
  }
];
