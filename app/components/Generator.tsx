'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import styles from './Generator.module.css';

const DEMO_USERS = ['torvalds', 'gaearon', 'vercel', 'sindresorhus'];

type BadgeData = {
  svg: string;
  cacheStatus?: string | null;
  stats?: {
    streak: number;
    contributions: number;
    repos: number;
  } | null;
};

type SuggestionData = {
  login: string;
  avatar_url: string;
  verified: boolean;
};

export default function Generator() {
  // ===== STATE MANAGEMENT =====
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [badge, setBadge] = useState<BadgeData | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);

  // ===== LOAD RECENT SEARCHES FROM LOCALSTORAGE =====
  useEffect(() => {
    const saved = localStorage.getItem('commitpulse_recent');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setRecentSearches(parsed);
        }
      } catch {
        // ignore parse error
      }
    }
  }, []);

  // ===== SAVE RECENT SEARCH =====
  const saveToRecent = (name: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item !== name);
      const updated = [name, ...filtered].slice(0, 5);
      localStorage.setItem('commitpulse_recent', JSON.stringify(updated));
      return updated;
    });
  };

  // ===== CLEAR RECENT SEARCHES =====
  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('commitpulse_recent');
  };

  // ===== VALIDATE USERNAME =====
  const validateUsername = (name: string) => {
    return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(name);
  };

  // ===== FETCH USER SUGGESTION =====
  const fetchUserSuggestion = async (name: string) => {
    if (!name.trim() || !validateUsername(name)) {
      setSuggestion(null);
      return;
    }

    try {
      const response = await fetch(`https://api.github.com/users/${name}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestion({
          login: data.login,
          avatar_url: data.avatar_url,
          verified: data.blog !== '' || data.company !== null,
        });
      } else {
        setSuggestion(null);
      }
    } catch (err) {
      console.error('Suggestion fetch error:', err);
      setSuggestion(null);
    }
  };

  // ===== HANDLE INPUT CHANGE =====
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    setError(null);
    setShowDropdown(!!value);

    if (value.length > 2) {
      fetchUserSuggestion(value);
    }
  };

  // ===== GENERATE BADGE =====
  const handleGenerateBadge = async (nameToSearch = username) => {
    setError(null);

    if (!nameToSearch.trim()) {
      toast.error('❌ Please enter a GitHub username');
      return;
    }

    if (!validateUsername(nameToSearch)) {
      toast.error('❌ Invalid GitHub username format');
      return;
    }

    setIsLoading(true);
    setShowDropdown(false);

    try {
      const response = await fetch(`/api/streak?user=${encodeURIComponent(nameToSearch)}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('❌ User not found on GitHub');
        }
        if (response.status === 429) {
          throw new Error('⏳ GitHub API rate limit exceeded. Please wait a few minutes.');
        }
        if (response.status >= 500) {
          throw new Error('⚠️ GitHub API is temporarily unavailable. Try again later.');
        }
        throw new Error('Failed to generate badge');
      }

      const svgText = await response.text();

      if (!svgText.includes('<svg')) {
        throw new Error('Invalid response from API');
      }

      // Also try to get the stats to fill out the stats section if possible
      let stats = null;
      try {
        const statsResponse = await fetch(
          `/api/streak?user=${encodeURIComponent(nameToSearch)}&format=json`
        );
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.stats) {
            stats = {
              streak: statsData.stats.currentStreak || 0,
              contributions: statsData.stats.totalContributions || 0,
              repos: 0, // The stats API doesn't return total repos directly here
            };
          }
        }
      } catch (e) {
        // ignore stats fetch error
      }

      setBadge({
        svg: svgText,
        cacheStatus: response.headers.get('X-Cache-Status'),
        stats: stats,
      });
      setUsername(nameToSearch);
      saveToRecent(nameToSearch);
      toast.success('✅ Badge generated successfully!');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Badge generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== HANDLE RECENT CLICK =====
  const handleRecentClick = (name: string) => {
    setUsername(name);
    setShowDropdown(false);
    handleGenerateBadge(name);
  };

  // ===== HANDLE DEMO CLICK =====
  const handleDemoClick = (name: string) => {
    setUsername(name);
    setShowDropdown(false);
    handleGenerateBadge(name);
  };

  // ===== HANDLE KEYBOARD =====
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGenerateBadge();
    }
  };

  return (
    <div className={styles.generatorContainer}>
      {/* SEARCH SECTION */}
      <div className={styles.searchSection}>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowDropdown(!!username)}
            placeholder="Enter GitHub username..."
            disabled={isLoading}
            className={styles.input}
          />

          {username && (
            <button
              onClick={() => {
                setUsername('');
                setBadge(null);
                setSuggestion(null);
              }}
              className={styles.clearBtn}
              disabled={isLoading}
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={() => handleGenerateBadge()}
          disabled={isLoading}
          className={styles.generateBtn}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner}></span>
              Generating...
            </>
          ) : (
            <>
              <span>🎨</span> Generate Badge
            </>
          )}
        </button>
      </div>

      {/* DROPDOWN MENU */}
      {showDropdown && username && (
        <div className={styles.dropdown}>
          {suggestion && (
            <div
              className={styles.suggestionItem}
              onClick={() => handleGenerateBadge(suggestion.login)}
            >
              <div className={styles.suggestionContent}>
                <div className={styles.suggestionName}>{suggestion.login}</div>
                <div className={styles.suggestionHandle}>@{suggestion.login}</div>
              </div>
              {suggestion.verified && (
                <span className={styles.verifiedBadge}>✓ Verified Profile</span>
              )}
            </div>
          )}

          {!suggestion && (
            <>
              <div className={styles.demoSection}>
                <label className={styles.sectionLabel}>DEMO:</label>
                <div className={styles.demoUsers}>
                  {DEMO_USERS.map((user) => (
                    <button
                      key={user}
                      onClick={() => handleDemoClick(user)}
                      className={styles.demoBtn}
                    >
                      @{user}
                    </button>
                  ))}
                </div>
              </div>

              {recentSearches.length > 0 && (
                <div className={styles.recentSection}>
                  <label className={styles.sectionLabel}>RECENT:</label>
                  <div className={styles.recentList}>
                    {recentSearches.map((name) => (
                      <div key={name} className={styles.recentItem}>
                        <button
                          onClick={() => handleRecentClick(name)}
                          className={styles.recentBtn}
                        >
                          {name}
                        </button>
                        <button
                          onClick={() =>
                            setRecentSearches((prev) => prev.filter((item) => item !== name))
                          }
                          className={styles.removeBtn}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {recentSearches.length > 0 && (
                      <button onClick={clearRecent} className={styles.clearAllBtn}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {isLoading && (
            <div className={styles.dropdownLoading}>
              <div className={styles.spinnerSmall}></div>
            </div>
          )}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && <div className={styles.errorMessage}>{error}</div>}

      {/* BADGE PREVIEW */}
      {badge && !isLoading && (
        <div className={styles.previewSection}>
          <div className={styles.previewContainer}>
            <div className={styles.badgePreview} dangerouslySetInnerHTML={{ __html: badge.svg }} />
            {badge.cacheStatus && <span className={styles.cacheStatus}>[{badge.cacheStatus}]</span>}
          </div>

          <div className={styles.copySection}>
            <p className={styles.copyLabel}>Add to your README:</p>
            <div className={styles.copyCode}>
              <code>{`[![CommitPulse](https://commitpulse.vercel.app/api/streak?user=${username})](https://commitpulse.vercel.app/)`}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `[![CommitPulse](https://commitpulse.vercel.app/api/streak?user=${username})](https://commitpulse.vercel.app/)`
                  );
                  toast.success('✅ Copied to clipboard!');
                }}
                className={styles.copyBtn}
              >
                📋 Copy
              </button>
            </div>
          </div>

          {badge.stats && (
            <div className={styles.statsSection}>
              <div className={styles.stat}>
                <div className={styles.statValue}>{badge.stats.streak}</div>
                <div className={styles.statLabel}>Current Streak</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{badge.stats.contributions}</div>
                <div className={styles.statLabel}>Contributions</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statValue}>{badge.stats.repos}</div>
                <div className={styles.statLabel}>Repositories</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
