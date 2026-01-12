/**
 * Image to Design Tokens - Main Application
 *
 * A client-side tool for extracting color palettes from images
 * and generating accessible design tokens for light and dark modes.
 */
(function() {
  'use strict';

  // ============================================
  // COLOR UTILITY FUNCTIONS
  // ============================================

  /**
   * Convert RGB to hex string
   */
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(x).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /**
   * Parse hex to RGB object
   */
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Calculate relative luminance per WCAG 2.1
   */
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  function getContrastRatio(rgb1, rgb2) {
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calculate color saturation (0-1)
   */
  function getSaturation(r, g, b) {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;

    if (max === min) return 0;

    const d = max - min;
    return l > 0.5 ? d / (2 - max - min) : d / (max + min);
  }

  /**
   * Convert RGB to HSL
   */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return { h: h * 360, s, l };
  }

  /**
   * Check if two colors are in similar hue range
   */
  function isSimilarHue(hsl1, hsl2, threshold = 30) {
    let diff = Math.abs(hsl1.h - hsl2.h);
    if (diff > 180) diff = 360 - diff;
    return diff < threshold;
  }

  /**
   * Calculate perceptual color distance
   */
  function colorDistance(c1, c2) {
    const rMean = (c1.r + c2.r) / 2;
    const dr = c1.r - c2.r;
    const dg = c1.g - c2.g;
    const db = c1.b - c2.b;

    return Math.sqrt(
      (2 + rMean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rMean) / 256) * db * db
    );
  }

  /**
   * Filter palette for valid light mode background candidates
   * Requirements:
   * - High luminance (light color)
   * - Must meet WCAG AA contrast with ALL text tokens (heading, text, mutedText)
   * @param {Array} palette - Analyzed palette with luminance/saturation
   * @param {Object} lightTokens - Generated light mode tokens to check contrast against
   * @returns {Array} Valid light mode background candidates
   */
  function filterLightBgCandidates(palette, lightTokens) {
    const MIN_LUMINANCE = 0.65;
    const MIN_CONTRAST = 4.5;
    const MUTED_MIN_CONTRAST = 3.0; // mutedText can use lower threshold per WCAG

    // Get actual text colors from tokens
    const headingRgb = lightTokens?.heading ? hexToRgb(lightTokens.heading) : null;
    const textRgb = lightTokens?.text ? hexToRgb(lightTokens.text) : null;
    const mutedRgb = lightTokens?.mutedText ? hexToRgb(lightTokens.mutedText) : null;

    // Fallback to reference dark text if tokens not available
    const fallbackText = { r: 29, g: 29, b: 31 }; // #1d1d1f

    return palette.filter(c => {
      if (c.luminance < MIN_LUMINANCE) {
        return false;
      }

      const bgRgb = { r: c.r, g: c.g, b: c.b };

      // Check ALL text tokens pass contrast on this bg
      if (headingRgb && getContrastRatio(headingRgb, bgRgb) < MIN_CONTRAST) return false;
      if (textRgb && getContrastRatio(textRgb, bgRgb) < MIN_CONTRAST) return false;
      if (mutedRgb && getContrastRatio(mutedRgb, bgRgb) < MUTED_MIN_CONTRAST) return false;

      // If no tokens available, fall back to generic dark text check
      if (!headingRgb && !textRgb && !mutedRgb) {
        const contrast = getContrastRatio(bgRgb, fallbackText);
        return contrast >= MIN_CONTRAST;
      }

      return true;
    }).sort((a, b) => b.luminance - a.luminance);
  }

  /**
   * Filter palette for valid dark mode background candidates
   * Requirements:
   * - Low luminance (dark color)
   * - Must meet WCAG AA contrast with ALL text tokens (heading, text, mutedText)
   * @param {Array} palette - Analyzed palette with luminance/saturation
   * @param {Object} darkTokens - Generated dark mode tokens to check contrast against
   * @returns {Array} Valid dark mode background candidates
   */
  function filterDarkBgCandidates(palette, darkTokens) {
    const MAX_LUMINANCE = 0.15;
    const MIN_CONTRAST = 4.5;
    const MUTED_MIN_CONTRAST = 3.0; // mutedText can use lower threshold per WCAG

    // Get actual text colors from tokens
    const headingRgb = darkTokens?.heading ? hexToRgb(darkTokens.heading) : null;
    const textRgb = darkTokens?.text ? hexToRgb(darkTokens.text) : null;
    const mutedRgb = darkTokens?.mutedText ? hexToRgb(darkTokens.mutedText) : null;

    // Fallback to reference light text if tokens not available
    const fallbackText = { r: 245, g: 245, b: 247 }; // #f5f5f7

    return palette.filter(c => {
      if (c.luminance > MAX_LUMINANCE) {
        return false;
      }

      const bgRgb = { r: c.r, g: c.g, b: c.b };

      // Check ALL text tokens pass contrast on this bg
      if (headingRgb && getContrastRatio(headingRgb, bgRgb) < MIN_CONTRAST) return false;
      if (textRgb && getContrastRatio(textRgb, bgRgb) < MIN_CONTRAST) return false;
      if (mutedRgb && getContrastRatio(mutedRgb, bgRgb) < MUTED_MIN_CONTRAST) return false;

      // If no tokens available, fall back to generic light text check
      if (!headingRgb && !textRgb && !mutedRgb) {
        const contrast = getContrastRatio(bgRgb, fallbackText);
        return contrast >= MIN_CONTRAST;
      }

      return true;
    }).sort((a, b) => a.luminance - b.luminance);
  }

  // ============================================
  // MEDIAN CUT ALGORITHM
  // ============================================

  /**
   * Extract pixels from canvas image data
   */
  function extractPixels(imageData) {
    const pixels = [];
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 128) continue;

      pixels.push({ r, g, b });
    }

    return pixels;
  }

  /**
   * Find the color channel with the largest range
   */
  function findLargestRange(pixels) {
    const ranges = {
      r: { min: 255, max: 0 },
      g: { min: 255, max: 0 },
      b: { min: 255, max: 0 }
    };

    pixels.forEach(p => {
      ['r', 'g', 'b'].forEach(channel => {
        ranges[channel].min = Math.min(ranges[channel].min, p[channel]);
        ranges[channel].max = Math.max(ranges[channel].max, p[channel]);
      });
    });

    let maxRange = 0;
    let maxChannel = 'r';

    ['r', 'g', 'b'].forEach(channel => {
      const range = ranges[channel].max - ranges[channel].min;
      if (range > maxRange) {
        maxRange = range;
        maxChannel = channel;
      }
    });

    return maxChannel;
  }

  /**
   * Perform median cut color quantization
   */
  function medianCut(pixels, targetColors) {
    if (pixels.length === 0) return [];

    let buckets = [pixels];

    while (buckets.length < targetColors) {
      let maxBucketIndex = 0;
      let maxBucketSize = 0;

      buckets.forEach((bucket, index) => {
        if (bucket.length > maxBucketSize) {
          maxBucketSize = bucket.length;
          maxBucketIndex = index;
        }
      });

      if (maxBucketSize <= 1) break;

      const bucket = buckets[maxBucketIndex];
      const channel = findLargestRange(bucket);

      bucket.sort((a, b) => a[channel] - b[channel]);

      const median = Math.floor(bucket.length / 2);
      const bucket1 = bucket.slice(0, median);
      const bucket2 = bucket.slice(median);

      buckets.splice(maxBucketIndex, 1, bucket1, bucket2);
    }

    const colors = buckets.map(bucket => {
      if (bucket.length === 0) return null;

      const sum = bucket.reduce((acc, p) => ({
        r: acc.r + p.r,
        g: acc.g + p.g,
        b: acc.b + p.b
      }), { r: 0, g: 0, b: 0 });

      return {
        r: Math.round(sum.r / bucket.length),
        g: Math.round(sum.g / bucket.length),
        b: Math.round(sum.b / bucket.length),
        population: bucket.length
      };
    }).filter(c => c !== null);

    return colors;
  }

  /**
   * Remove near-duplicate colors from palette
   */
  function removeDuplicates(colors, threshold = 25) {
    const filtered = [];

    colors.forEach(color => {
      const isDuplicate = filtered.some(existing =>
        colorDistance(color, existing) < threshold
      );

      if (!isDuplicate) {
        filtered.push(color);
      } else {
        let minDist = Infinity;
        let closestIndex = 0;

        filtered.forEach((existing, index) => {
          const dist = colorDistance(color, existing);
          if (dist < minDist) {
            minDist = dist;
            closestIndex = index;
          }
        });

        // Fix 5: When merging duplicates, keep the MORE saturated version (brand colors)
        const existingSat = getSaturation(filtered[closestIndex].r, filtered[closestIndex].g, filtered[closestIndex].b);
        const newSat = getSaturation(color.r, color.g, color.b);

        if (newSat > existingSat) {
          // Replace with more saturated version, preserving combined population
          const combinedPopulation = filtered[closestIndex].population + color.population;
          filtered[closestIndex] = { ...color, population: combinedPopulation };
        } else {
          filtered[closestIndex].population += color.population;
        }
      }
    });

    return filtered;
  }

  /**
   * Extract vibrant colors that may have been averaged away
   */
  function extractVibrantColors(pixels, existingPalette) {
    // Increased from 12 to 18 buckets (20° each) for finer hue distinction
    const hueBuckets = Array.from({ length: 18 }, () => []);

    pixels.forEach(p => {
      const sat = getSaturation(p.r, p.g, p.b);
      // Lowered from 0.3 to 0.25 to include more vibrant colors
      if (sat < 0.25) return;

      const hsl = rgbToHsl(p.r, p.g, p.b);
      // Widened to 0.10-0.90 to capture bright oranges and vivid colors
      if (hsl.l < 0.10 || hsl.l > 0.90) return;

      const bucketIndex = Math.floor(hsl.h / 20) % 18;
      hueBuckets[bucketIndex].push({ ...p, hsl, sat });
    });

    const vibrantColors = [];

    hueBuckets.forEach(bucket => {
      // Lowered from 10 to 5 to catch small accent colors (buttons, icons)
      if (bucket.length < 5) return;

      bucket.sort((a, b) => b.sat - a.sat);

      const topCount = Math.max(5, Math.floor(bucket.length * 0.05));
      const topPixels = bucket.slice(0, topCount);

      const avg = {
        r: Math.round(topPixels.reduce((s, p) => s + p.r, 0) / topPixels.length),
        g: Math.round(topPixels.reduce((s, p) => s + p.g, 0) / topPixels.length),
        b: Math.round(topPixels.reduce((s, p) => s + p.b, 0) / topPixels.length),
        population: bucket.length,
        isVibrant: true
      };

      const isDuplicate = existingPalette.some(existing => {
        const dist = colorDistance(avg, existing);
        // Reduced from 40 to 35 to preserve more distinct vibrant colors
        if (dist < 35) return true;

        const existingHsl = rgbToHsl(existing.r, existing.g, existing.b);
        const avgHsl = rgbToHsl(avg.r, avg.g, avg.b);

        if (isSimilarHue(existingHsl, avgHsl, 25)) {
          // Relaxed from 1.3x to 1.15x - more permissive for vibrant variants
          return avgHsl.s <= existingHsl.s * 1.15;
        }

        return false;
      });

      // Lowered from 0.4 to 0.35 to include more vibrant colors like bright orange
      if (!isDuplicate && getSaturation(avg.r, avg.g, avg.b) > 0.35) {
        vibrantColors.push(avg);
      }
    });

    return vibrantColors;
  }

  /**
   * Extract brand/accent colors - highly saturated colors regardless of population
   * These are likely intentional design choices (buttons, icons, accents)
   */
  function extractBrandColors(pixels, existingPalette) {
    // Group pixels by major hue ranges (6 ranges: red, orange, yellow, green, blue, purple)
    const hueRanges = [
      { name: 'red', min: 0, max: 30, pixels: [] },
      { name: 'orange', min: 30, max: 60, pixels: [] },
      { name: 'yellow', min: 60, max: 90, pixels: [] },
      { name: 'green', min: 90, max: 180, pixels: [] },
      { name: 'blue', min: 180, max: 270, pixels: [] },
      { name: 'purple', min: 270, max: 330, pixels: [] },
      { name: 'red2', min: 330, max: 360, pixels: [] }
    ];

    // Find the most saturated pixel in each hue range
    pixels.forEach(p => {
      const sat = getSaturation(p.r, p.g, p.b);
      // Lowered from 0.6 to 0.45 to catch more real-world vibrant colors
      if (sat < 0.45) return;

      const hsl = rgbToHsl(p.r, p.g, p.b);
      // Widened from 0.15-0.85 to 0.12-0.88 to include bright oranges/yellows
      if (hsl.l < 0.12 || hsl.l > 0.88) return;

      const range = hueRanges.find(r => hsl.h >= r.min && hsl.h < r.max);
      if (range) {
        range.pixels.push({ ...p, hsl, sat });
      }
    });

    const brandColors = [];

    hueRanges.forEach(range => {
      if (range.pixels.length === 0) return;

      // Sort by saturation (highest first)
      range.pixels.sort((a, b) => b.sat - a.sat);

      // Take the top 3 most saturated pixels and average them
      const topPixels = range.pixels.slice(0, 3);
      const avg = {
        r: Math.round(topPixels.reduce((s, p) => s + p.r, 0) / topPixels.length),
        g: Math.round(topPixels.reduce((s, p) => s + p.g, 0) / topPixels.length),
        b: Math.round(topPixels.reduce((s, p) => s + p.b, 0) / topPixels.length),
        population: range.pixels.length,
        isBrandColor: true,
        isVibrant: true
      };

      // Check if this brand color is truly different from existing palette
      const isDuplicate = existingPalette.some(existing => {
        const dist = colorDistance(avg, existing);
        if (dist < 30) return true;

        // Also check if existing color has similar hue but higher saturation
        const existingHsl = rgbToHsl(existing.r, existing.g, existing.b);
        const avgHsl = rgbToHsl(avg.r, avg.g, avg.b);
        if (isSimilarHue(existingHsl, avgHsl, 20)) {
          return existingHsl.s >= avgHsl.s;
        }
        return false;
      });

      // Lowered from 0.55 to 0.40 to catch more vibrant colors
      if (!isDuplicate && getSaturation(avg.r, avg.g, avg.b) > 0.40) {
        brandColors.push(avg);
      }
    });

    return brandColors;
  }

  /**
   * Find a more vibrant version of a color from the palette
   */
  function findMostVibrantVariant(color, palette) {
    const colorHsl = rgbToHsl(color.r, color.g, color.b);

    let bestMatch = color;
    let bestSaturation = colorHsl.s;

    palette.forEach(p => {
      const pHsl = rgbToHsl(p.r, p.g, p.b);

      if (isSimilarHue(colorHsl, pHsl, 35)) {
        if (pHsl.s > bestSaturation && pHsl.l > 0.25 && pHsl.l < 0.75) {
          bestMatch = p;
          bestSaturation = pHsl.s;
        }
      }
    });

    return bestMatch;
  }

  // ============================================
  // TOKEN MAPPING
  // ============================================

  /**
   * Generate design tokens from palette
   */
  function generateTokens(palette, lockedPrimary = null, lockedLightBg = null, lockedDarkBg = null) {
    const warnings = [];

    const analyzed = palette.map(c => ({
      ...c,
      hex: rgbToHex(c.r, c.g, c.b),
      luminance: getLuminance(c.r, c.g, c.b),
      saturation: getSaturation(c.r, c.g, c.b)
    }));

    const findBest = (filter, sortKey = 'population') => {
      const matches = analyzed.filter(filter);
      if (matches.length === 0) return null;
      return matches.sort((a, b) => b[sortKey] - a[sortKey])[0];
    };

    // Always use fallback colors when no palette color matches
    const useColor = (color, fallbackHex) => {
      if (color) return color.hex;
      return fallbackHex;
    };

    // Ensure contrast helper - validates and guarantees contrast for text tokens
    const ensureContrast = (candidateHex, backgroundRgb, minContrast, fallbackLight, fallbackDark) => {
      if (candidateHex) {
        const candidateRgb = hexToRgb(candidateHex);
        if (getContrastRatio(candidateRgb, backgroundRgb) >= minContrast) {
          return candidateHex;
        }
      }
      // Candidate failed or missing - try both fallbacks and pick the one that passes
      const lightRgb = hexToRgb(fallbackLight);
      const darkRgb = hexToRgb(fallbackDark);
      const lightContrast = getContrastRatio(lightRgb, backgroundRgb);
      const darkContrast = getContrastRatio(darkRgb, backgroundRgb);

      if (lightContrast >= minContrast) return fallbackLight;
      if (darkContrast >= minContrast) return fallbackDark;

      // Neither passes - use whichever is better
      return lightContrast > darkContrast ? fallbackLight : fallbackDark;
    };

    // ============================================
    // LIGHT MODE TOKEN GENERATION
    // ============================================
    const lightTokens = {};

    // Use locked light background if set, otherwise use algorithm
    let lightBgCandidate = null;
    if (lockedLightBg) {
      lightBgCandidate = analyzed.find(c => c.hex.toLowerCase() === lockedLightBg.toLowerCase());
      if (!lightBgCandidate) {
        const rgb = hexToRgb(lockedLightBg);
        if (rgb) {
          lightBgCandidate = {
            ...rgb,
            hex: lockedLightBg,
            luminance: getLuminance(rgb.r, rgb.g, rgb.b),
            saturation: getSaturation(rgb.r, rgb.g, rgb.b)
          };
        }
      }
    } else {
      // Relaxed: luminance > 0.75 (was 0.85), saturation < 0.20 (was 0.15)
      lightBgCandidate = findBest(c => c.luminance > 0.75 && c.saturation < 0.20);
    }
    lightTokens.bg = useColor(lightBgCandidate, '#f7f7f7');

    const lightBgLuminance = lightTokens.bg ?
      getLuminance(...Object.values(hexToRgb(lightTokens.bg))) : 0.95;

    // Relaxed: luminance > 0.85 (was 0.92), saturation < 0.12 (was 0.05)
    const lightSurfaceCandidate = findBest(c =>
      c.luminance > 0.85 &&
      c.saturation < 0.12 &&
      (!lightBgCandidate || c.hex !== lightBgCandidate.hex)
    );
    lightTokens.surface = useColor(lightSurfaceCandidate, '#ffffff');

    if (lightTokens.surface === lightTokens.bg) {
      lightTokens.surface = '#ffffff';
    }

    const lightSurfaceLuminance = lightTokens.surface ?
      getLuminance(...Object.values(hexToRgb(lightTokens.surface))) : 1;

    // Relaxed: luminance range 0.5-0.95 (was 0.7-0.92), saturation < 0.15 (was 0.1)
    const lightBorderCandidate = findBest(c =>
      c.luminance < lightSurfaceLuminance &&
      c.luminance > 0.5 &&
      c.luminance < 0.95 &&
      c.saturation < 0.15 &&
      c.hex !== lightTokens.bg &&
      c.hex !== lightTokens.surface
    );
    lightTokens.border = useColor(lightBorderCandidate, '#e0e0e0');

    const surfaceRgb = hexToRgb(lightTokens.surface || '#ffffff');

    const LIGHT_TEXT_MAX_SATURATION = 0.25;

    const lightHeadingCandidates = analyzed
      .filter(c => {
        if (c.saturation > LIGHT_TEXT_MAX_SATURATION) return false;
        if (!surfaceRgb) return c.luminance < 0.2;
        const contrast = getContrastRatio(c, surfaceRgb);
        return contrast >= 4.5;
      })
      .map(c => ({
        ...c,
        textScore: (1 - c.luminance) * 2 - c.saturation * 2
      }))
      .sort((a, b) => b.textScore - a.textScore);

    const lightHeadingCandidate = lightHeadingCandidates[0];
    // Use ensureContrast to guarantee heading passes WCAG AA
    lightTokens.heading = ensureContrast(
      lightHeadingCandidate?.hex,
      surfaceRgb || { r: 255, g: 255, b: 255 },
      4.5,
      '#1a1a1a',  // Near-black fallback
      '#000000'   // Pure black fallback
    );

    const lightTextCandidate = lightHeadingCandidates.find(c =>
      c.hex !== lightHeadingCandidate?.hex
    ) || lightHeadingCandidate;
    // Use ensureContrast to guarantee text passes WCAG AA
    lightTokens.text = ensureContrast(
      lightTextCandidate?.hex,
      surfaceRgb || { r: 255, g: 255, b: 255 },
      4.5,
      '#333333',  // Dark gray fallback
      '#111111'   // Darker fallback
    );

    if (lightTokens.text && lightTokens.heading) {
      const textLum = getLuminance(...Object.values(hexToRgb(lightTokens.text)));
      const headingLum = getLuminance(...Object.values(hexToRgb(lightTokens.heading)));
      if (textLum < headingLum) {
        [lightTokens.text, lightTokens.heading] = [lightTokens.heading, lightTokens.text];
      }
    }

    // Ensure heading and text are different for visual hierarchy
    if (lightTokens.heading === lightTokens.text) {
      // Heading should be darker (bolder), text slightly lighter
      lightTokens.heading = '#1a1a1a';
      lightTokens.text = '#444444';
    }

    const textLuminance = lightTokens.text ?
      getLuminance(...Object.values(hexToRgb(lightTokens.text))) : 0;

    const lightMutedCandidates = analyzed
      .filter(c => {
        if (c.saturation > LIGHT_TEXT_MAX_SATURATION) return false;
        if (!surfaceRgb) return c.luminance > 0.2 && c.luminance < 0.5;
        const contrast = getContrastRatio(c, surfaceRgb);
        // Raised from 3 to 4 for better readability candidates
        return contrast >= 4 && contrast < 7 &&
               c.luminance > textLuminance &&
               c.hex !== lightTokens.heading &&
               c.hex !== lightTokens.text;
      })
      .map(c => ({
        ...c,
        mutedScore: (1 - Math.abs(c.luminance - 0.4)) - c.saturation
      }))
      .sort((a, b) => b.mutedScore - a.mutedScore);

    // Use ensureContrast to guarantee mutedText is comfortably readable
    // Raised from 4.5 to 5.5 for better readability (4.5 is the minimum, not optimal)
    const lightMutedCandidate = lightMutedCandidates[0]?.hex;
    lightTokens.mutedText = ensureContrast(
      lightMutedCandidate,
      surfaceRgb || { r: 255, g: 255, b: 255 },
      5.5,  // Raised from 4.5 for comfortable readability
      '#555555',  // Darker fallback for better contrast
      '#444444'   // Even darker fallback
    );

    // VALIDATION: Ensure bg passes contrast with all text tokens
    // This fixes the chicken-and-egg problem where bg is selected before text tokens exist
    const BG_MIN_CONTRAST = 4.5;
    const BG_MUTED_MIN_CONTRAST = 3.0;

    const lightBgRgb = hexToRgb(lightTokens.bg);
    let lightBgNeedsReplacement = false;

    if (lightBgRgb && !lockedLightBg) {
      const headingRgbForBg = hexToRgb(lightTokens.heading);
      const textRgbForBg = hexToRgb(lightTokens.text);
      const mutedRgbForBg = hexToRgb(lightTokens.mutedText);

      if (headingRgbForBg && getContrastRatio(headingRgbForBg, lightBgRgb) < BG_MIN_CONTRAST) {
        lightBgNeedsReplacement = true;
      }
      if (textRgbForBg && getContrastRatio(textRgbForBg, lightBgRgb) < BG_MIN_CONTRAST) {
        lightBgNeedsReplacement = true;
      }
      if (mutedRgbForBg && getContrastRatio(mutedRgbForBg, lightBgRgb) < BG_MUTED_MIN_CONTRAST) {
        lightBgNeedsReplacement = true;
      }
    }

    // If bg fails contrast, find a replacement from palette or use fallback
    if (lightBgNeedsReplacement) {
      const headingRgbForBg = hexToRgb(lightTokens.heading);
      const textRgbForBg = hexToRgb(lightTokens.text);
      const mutedRgbForBg = hexToRgb(lightTokens.mutedText);

      // Try to find a palette color that passes all contrast checks
      // Sort by luminance descending to prefer lighter backgrounds
      const validLightBgCandidates = analyzed
        .filter(c => {
          if (c.luminance < 0.65) return false;
          const bgRgb = { r: c.r, g: c.g, b: c.b };
          if (headingRgbForBg && getContrastRatio(headingRgbForBg, bgRgb) < BG_MIN_CONTRAST) return false;
          if (textRgbForBg && getContrastRatio(textRgbForBg, bgRgb) < BG_MIN_CONTRAST) return false;
          if (mutedRgbForBg && getContrastRatio(mutedRgbForBg, bgRgb) < BG_MUTED_MIN_CONTRAST) return false;
          return true;
        })
        .sort((a, b) => b.luminance - a.luminance);

      if (validLightBgCandidates.length > 0) {
        lightTokens.bg = validLightBgCandidates[0].hex;
      } else {
        // Ultimate fallback: use safe white/near-white
        lightTokens.bg = '#f7f7f7';
      }
    }

    // Primary color selection for light mode
    let lightPrimary = null;

    if (lockedPrimary) {
      lightPrimary = analyzed.find(c => c.hex.toLowerCase() === lockedPrimary.toLowerCase());
      if (!lightPrimary) {
        const rgb = hexToRgb(lockedPrimary);
        if (rgb) {
          lightPrimary = {
            ...rgb,
            hex: lockedPrimary,
            luminance: getLuminance(rgb.r, rgb.g, rgb.b),
            saturation: getSaturation(rgb.r, rgb.g, rgb.b)
          };
        }
      }
    }

    if (!lightPrimary) {
      // Lowered: was 0.30, now 0.20 to include more colors
      const PRIMARY_MIN_SATURATION = 0.20;
      const usedTextColors = [lightTokens.heading, lightTokens.text, lightTokens.mutedText].filter(Boolean);
      const lightSurfaceForPrimary = hexToRgb(lightTokens.surface || '#ffffff');
      const lightBgForPrimary = hexToRgb(lightTokens.bg || '#f7f7f7');

      const primaryCandidates = analyzed
        .filter(c => {
          if (c.saturation < PRIMARY_MIN_SATURATION) return false;
          if (usedTextColors.includes(c.hex)) return false;

          // Fix 1: Relaxed contrast - only check surface (not bg), lowered to 2.5:1
          const contrastVsSurface = getContrastRatio(c, lightSurfaceForPrimary);
          if (contrastVsSurface < 2.5) return false;

          return true;
        })
        .map(c => {
          const isVibrant = palette.find(p =>
            rgbToHex(p.r, p.g, p.b).toLowerCase() === c.hex.toLowerCase()
          )?.isVibrant || false;

          const saturationScore = c.saturation * 4;
          const vibrantBonus = isVibrant ? 2.5 : 0;
          const luminanceScore = 1 - Math.abs(c.luminance - 0.45);
          const populationScore = Math.log(c.population + 1) / 12;

          const contrastVsSurface = getContrastRatio(c, lightSurfaceForPrimary);
          const contrastBonus = Math.min(contrastVsSurface / 10, 0.5);

          // Fix 2: Much stronger penalties for extreme luminance colors
          // Ideal light mode primary: luminance 0.25-0.65
          const lightPenalty = c.luminance > 0.85 ? 2.0 : (c.luminance > 0.75 ? 0.8 : (c.luminance > 0.65 ? 0.3 : 0));
          const darkPenalty = c.luminance < 0.15 ? 3.0 : (c.luminance < 0.25 ? 1.0 : 0);

          return {
            ...c,
            isVibrant,
            primaryScore: saturationScore + vibrantBonus + luminanceScore + populationScore + contrastBonus - lightPenalty - darkPenalty
          };
        })
        .sort((a, b) => b.primaryScore - a.primaryScore);

      lightPrimary = primaryCandidates[0];

      // Fix 4: Fallback cascade - try progressively relaxed thresholds before default
      if (!lightPrimary) {
        // Try 1: Lower saturation threshold (0.15 instead of 0.20)
        const relaxedSatCandidates = analyzed
          .filter(c => {
            if (c.saturation < 0.15) return false;
            if (usedTextColors.includes(c.hex)) return false;
            const contrastVsSurface = getContrastRatio(c, lightSurfaceForPrimary);
            if (contrastVsSurface < 2.5) return false;
            // Exclude very dark and very light colors
            if (c.luminance < 0.15 || c.luminance > 0.85) return false;
            return true;
          })
          .sort((a, b) => b.saturation - a.saturation);

        lightPrimary = relaxedSatCandidates[0];
      }

      if (!lightPrimary) {
        // Try 2: Lower contrast threshold (2.0 instead of 2.5)
        const relaxedContrastCandidates = analyzed
          .filter(c => {
            if (c.saturation < 0.15) return false;
            if (usedTextColors.includes(c.hex)) return false;
            const contrastVsSurface = getContrastRatio(c, lightSurfaceForPrimary);
            if (contrastVsSurface < 2.0) return false;
            // Exclude very dark and very light colors
            if (c.luminance < 0.15 || c.luminance > 0.85) return false;
            return true;
          })
          .sort((a, b) => b.saturation - a.saturation);

        lightPrimary = relaxedContrastCandidates[0];
      }

      if (!lightPrimary) {
        // Final fallback: use default blue
        lightPrimary = {
          r: 0, g: 113, b: 227,
          hex: '#0071e3',
          luminance: getLuminance(0, 113, 227),
          saturation: getSaturation(0, 113, 227)
        };
      }

      if (lightPrimary && !lightPrimary.isVibrant && lightPrimary.hex !== '#0071e3') {
        const moreVibrant = findMostVibrantVariant(
          { r: hexToRgb(lightPrimary.hex).r, g: hexToRgb(lightPrimary.hex).g, b: hexToRgb(lightPrimary.hex).b },
          palette
        );
        if (moreVibrant && getSaturation(moreVibrant.r, moreVibrant.g, moreVibrant.b) > lightPrimary.saturation * 1.2) {
          const newContrast = getContrastRatio(moreVibrant, lightSurfaceForPrimary);
          if (newContrast >= 3) {
            lightPrimary = {
              ...moreVibrant,
              hex: rgbToHex(moreVibrant.r, moreVibrant.g, moreVibrant.b),
              luminance: getLuminance(moreVibrant.r, moreVibrant.g, moreVibrant.b),
              saturation: getSaturation(moreVibrant.r, moreVibrant.g, moreVibrant.b)
            };
          }
        }
      }
    }

    if (lightPrimary) {
      lightTokens.primary = lightPrimary.hex;

      const contrastWithWhite = getContrastRatio(lightPrimary, { r: 255, g: 255, b: 255 });
      const contrastWithBlack = getContrastRatio(lightPrimary, { r: 0, g: 0, b: 0 });

      if (contrastWithWhite >= 4.5) {
        lightTokens.onPrimary = '#ffffff';
      } else if (contrastWithBlack >= 4.5) {
        lightTokens.onPrimary = '#000000';
      } else {
        if (!lockedPrimary) {
          const betterPrimary = analyzed.find(c => {
            const cWhite = getContrastRatio(c, { r: 255, g: 255, b: 255 });
            const cBlack = getContrastRatio(c, { r: 0, g: 0, b: 0 });
            return (cWhite >= 4.5 || cBlack >= 4.5) && c.saturation > 0.2;
          });

          if (betterPrimary) {
            lightTokens.primary = betterPrimary.hex;
            const cw = getContrastRatio(betterPrimary, { r: 255, g: 255, b: 255 });
            lightTokens.onPrimary = cw >= 4.5 ? '#ffffff' : '#000000';
          } else {
            lightTokens.primary = '#0071e3';
            lightTokens.onPrimary = '#ffffff';
          }
        } else {
          lightTokens.onPrimary = contrastWithWhite > contrastWithBlack ? '#ffffff' : '#000000';
        }
      }
    } else {
      lightTokens.primary = useColor(null, '#0071e3');
      lightTokens.onPrimary = '#ffffff';
    }

    // ============================================
    // DARK MODE TOKEN GENERATION
    // ============================================
    const darkTokens = {};

    // Use locked dark background if set, otherwise use algorithm
    let darkBgCandidate = null;
    if (lockedDarkBg) {
      darkBgCandidate = analyzed.find(c => c.hex.toLowerCase() === lockedDarkBg.toLowerCase());
      if (!darkBgCandidate) {
        const rgb = hexToRgb(lockedDarkBg);
        if (rgb) {
          darkBgCandidate = {
            ...rgb,
            hex: lockedDarkBg,
            luminance: getLuminance(rgb.r, rgb.g, rgb.b),
            saturation: getSaturation(rgb.r, rgb.g, rgb.b)
          };
        }
      }
    } else {
      // Relaxed: luminance < 0.06 (was 0.03), saturation < 0.20 (was 0.15)
      darkBgCandidate = findBest(c => c.luminance < 0.06 && c.saturation < 0.20);
    }
    darkTokens.bg = useColor(darkBgCandidate, '#0b0b0b');

    const bgLuminance = darkTokens.bg ?
      getLuminance(...Object.values(hexToRgb(darkTokens.bg))) : 0.01;

    // Tightened: luminance < 0.05 to prevent mid-grays from being selected as dark surface
    const darkSurfaceCandidate = findBest(c =>
      c.luminance > bgLuminance &&
      c.luminance < 0.05 &&
      c.saturation < 0.15 &&
      (!darkBgCandidate || c.hex !== darkBgCandidate.hex)
    );
    darkTokens.surface = useColor(darkSurfaceCandidate, '#141414');

    if (darkTokens.surface === darkTokens.bg) {
      darkTokens.surface = '#141414';
    }

    const surfaceLuminance = darkTokens.surface ?
      getLuminance(...Object.values(hexToRgb(darkTokens.surface))) : 0.02;

    // Relaxed: luminance < 0.35 (was 0.25), saturation < 0.20 (was 0.15)
    const darkBorderCandidate = findBest(c =>
      c.luminance > surfaceLuminance &&
      c.luminance < 0.35 &&
      c.saturation < 0.20 &&
      c.hex !== darkTokens.bg &&
      c.hex !== darkTokens.surface
    );
    darkTokens.border = useColor(darkBorderCandidate, '#2a2a2a');

    const darkSurfaceRgb = hexToRgb(darkTokens.surface || '#141414');

    const DARK_TEXT_MAX_SATURATION = 0.25;

    const darkHeadingCandidates = analyzed
      .filter(c => {
        if (c.saturation > DARK_TEXT_MAX_SATURATION) return false;
        if (!darkSurfaceRgb) return c.luminance > 0.7;
        const contrast = getContrastRatio(c, darkSurfaceRgb);
        return contrast >= 4.5;
      })
      .map(c => ({
        ...c,
        textScore: c.luminance * 2 - c.saturation * 2
      }))
      .sort((a, b) => b.textScore - a.textScore);

    const darkHeadingCandidate = darkHeadingCandidates[0];
    // Use ensureContrast to guarantee heading passes WCAG AA
    darkTokens.heading = ensureContrast(
      darkHeadingCandidate?.hex,
      darkSurfaceRgb || { r: 11, g: 11, b: 11 },
      4.5,
      '#ffffff',  // White fallback
      '#e8e8e8'   // Lighter gray fallback
    );

    const darkTextCandidate = darkHeadingCandidates.find(c =>
      c.hex !== darkHeadingCandidate?.hex
    ) || darkHeadingCandidate;
    // Use ensureContrast to guarantee text passes WCAG AA
    darkTokens.text = ensureContrast(
      darkTextCandidate?.hex,
      darkSurfaceRgb || { r: 11, g: 11, b: 11 },
      4.5,
      '#f0f0f0',  // Light gray fallback
      '#d4d4d4'   // Slightly darker fallback
    );

    if (darkTokens.text && darkTokens.heading) {
      const textLum = getLuminance(...Object.values(hexToRgb(darkTokens.text)));
      const headingLum = getLuminance(...Object.values(hexToRgb(darkTokens.heading)));
      if (textLum > headingLum) {
        [darkTokens.text, darkTokens.heading] = [darkTokens.heading, darkTokens.text];
      }
    }

    // Ensure heading and text are different for visual hierarchy
    if (darkTokens.heading === darkTokens.text) {
      // Heading should be lighter (bolder), text slightly darker
      darkTokens.heading = '#ffffff';
      darkTokens.text = '#c0c0c0';
    }

    const darkTextLuminance = darkTokens.text ?
      getLuminance(...Object.values(hexToRgb(darkTokens.text))) : 1;

    const darkMutedCandidates = analyzed
      .filter(c => {
        if (c.saturation > DARK_TEXT_MAX_SATURATION) return false;
        if (!darkSurfaceRgb) return c.luminance > 0.3 && c.luminance < 0.6;
        const contrast = getContrastRatio(c, darkSurfaceRgb);
        // Raised from 3 to 4 for better readability candidates
        return contrast >= 4 && contrast < 10 &&
               c.luminance < darkTextLuminance &&
               c.hex !== darkTokens.heading &&
               c.hex !== darkTokens.text;
      })
      .map(c => ({
        ...c,
        mutedScore: (1 - Math.abs(c.luminance - 0.5)) - c.saturation
      }))
      .sort((a, b) => b.mutedScore - a.mutedScore);

    // Use ensureContrast to guarantee mutedText is comfortably readable
    // Raised from 4.5 to 5.5 for better readability (4.5 is the minimum, not optimal)
    const darkMutedCandidate = darkMutedCandidates[0]?.hex;
    darkTokens.mutedText = ensureContrast(
      darkMutedCandidate,
      darkSurfaceRgb || { r: 11, g: 11, b: 11 },
      5.5,  // Raised from 4.5 for comfortable readability
      '#d0d0d0',  // Lighter fallback for better contrast
      '#b8b8b8'   // Alternative fallback
    );

    // VALIDATION: Ensure dark bg passes contrast with all text tokens
    const DARK_BG_MIN_CONTRAST = 4.5;
    const DARK_BG_MUTED_MIN_CONTRAST = 3.0;

    const darkBgRgb = hexToRgb(darkTokens.bg);
    let darkBgNeedsReplacement = false;

    if (darkBgRgb && !lockedDarkBg) {
      const darkHeadingRgbForBg = hexToRgb(darkTokens.heading);
      const darkTextRgbForBg = hexToRgb(darkTokens.text);
      const darkMutedRgbForBg = hexToRgb(darkTokens.mutedText);

      if (darkHeadingRgbForBg && getContrastRatio(darkHeadingRgbForBg, darkBgRgb) < DARK_BG_MIN_CONTRAST) {
        darkBgNeedsReplacement = true;
      }
      if (darkTextRgbForBg && getContrastRatio(darkTextRgbForBg, darkBgRgb) < DARK_BG_MIN_CONTRAST) {
        darkBgNeedsReplacement = true;
      }
      if (darkMutedRgbForBg && getContrastRatio(darkMutedRgbForBg, darkBgRgb) < DARK_BG_MUTED_MIN_CONTRAST) {
        darkBgNeedsReplacement = true;
      }
    }

    // If dark bg fails contrast, find a replacement from palette or use fallback
    if (darkBgNeedsReplacement) {
      const darkHeadingRgbForBg = hexToRgb(darkTokens.heading);
      const darkTextRgbForBg = hexToRgb(darkTokens.text);
      const darkMutedRgbForBg = hexToRgb(darkTokens.mutedText);

      // Try to find a palette color that passes all contrast checks
      // Sort by luminance ascending to prefer darker backgrounds
      const validDarkBgCandidates = analyzed
        .filter(c => {
          if (c.luminance > 0.15) return false;
          const bgRgb = { r: c.r, g: c.g, b: c.b };
          if (darkHeadingRgbForBg && getContrastRatio(darkHeadingRgbForBg, bgRgb) < DARK_BG_MIN_CONTRAST) return false;
          if (darkTextRgbForBg && getContrastRatio(darkTextRgbForBg, bgRgb) < DARK_BG_MIN_CONTRAST) return false;
          if (darkMutedRgbForBg && getContrastRatio(darkMutedRgbForBg, bgRgb) < DARK_BG_MUTED_MIN_CONTRAST) return false;
          return true;
        })
        .sort((a, b) => a.luminance - b.luminance);

      if (validDarkBgCandidates.length > 0) {
        darkTokens.bg = validDarkBgCandidates[0].hex;
      } else {
        // Ultimate fallback: use safe near-black
        darkTokens.bg = '#0b0b0b';
      }
    }

    // Primary color selection for dark mode
    let darkPrimary = null;

    if (lockedPrimary) {
      darkPrimary = analyzed.find(c => c.hex.toLowerCase() === lockedPrimary.toLowerCase());
      if (!darkPrimary) {
        const rgb = hexToRgb(lockedPrimary);
        if (rgb) {
          darkPrimary = {
            ...rgb,
            hex: lockedPrimary,
            luminance: getLuminance(rgb.r, rgb.g, rgb.b),
            saturation: getSaturation(rgb.r, rgb.g, rgb.b)
          };
        }
      }
    }

    if (!darkPrimary) {
      // Lowered: was 0.30, now 0.20 to include more colors
      const PRIMARY_MIN_SATURATION = 0.20;
      const usedTextColors = [darkTokens.heading, darkTokens.text, darkTokens.mutedText].filter(Boolean);
      const darkSurfaceForPrimary = hexToRgb(darkTokens.surface || '#141414');
      const darkBgForPrimary = hexToRgb(darkTokens.bg || '#0b0b0b');

      const primaryCandidates = analyzed
        .filter(c => {
          if (c.saturation < PRIMARY_MIN_SATURATION) return false;
          if (usedTextColors.includes(c.hex)) return false;

          // Fix 3: Relaxed contrast for dark mode - only check surface, lowered to 2.5:1
          const contrastVsSurface = getContrastRatio(c, darkSurfaceForPrimary);
          if (contrastVsSurface < 2.5) return false;

          return true;
        })
        .map(c => {
          const isVibrant = palette.find(p =>
            rgbToHex(p.r, p.g, p.b).toLowerCase() === c.hex.toLowerCase()
          )?.isVibrant || false;

          const saturationScore = c.saturation * 4;
          const vibrantBonus = isVibrant ? 2.5 : 0;
          // Fix 3: Target 0.45 luminance for dark mode primary (mid-brightness colors)
          const luminanceScore = 1 - Math.abs(c.luminance - 0.45);
          const populationScore = Math.log(c.population + 1) / 12;

          const contrastVsSurface = getContrastRatio(c, darkSurfaceForPrimary);
          const contrastBonus = Math.min(contrastVsSurface / 10, 0.5);

          // Fix 3: Stronger penalties for extreme luminance colors in dark mode
          // Penalize very dark colors that won't show on dark bg
          const darkPenalty = c.luminance < 0.15 ? 1.5 : (c.luminance < 0.25 ? 0.5 : 0);
          // Penalize very light colors that look washed out on dark mode
          const lightPenalty = c.luminance > 0.8 ? 1.5 : (c.luminance > 0.7 ? 0.5 : 0);

          return {
            ...c,
            isVibrant,
            primaryScore: saturationScore + vibrantBonus + luminanceScore + populationScore + contrastBonus - darkPenalty - lightPenalty
          };
        })
        .sort((a, b) => b.primaryScore - a.primaryScore);

      darkPrimary = primaryCandidates[0];

      // Fix 4: Fallback cascade for dark mode
      if (!darkPrimary) {
        // Try 1: Lower saturation threshold (0.15 instead of 0.20)
        const relaxedSatCandidates = analyzed
          .filter(c => {
            if (c.saturation < 0.15) return false;
            if (usedTextColors.includes(c.hex)) return false;
            const contrastVsSurface = getContrastRatio(c, darkSurfaceForPrimary);
            if (contrastVsSurface < 2.5) return false;
            // Exclude very dark and very light colors for dark mode
            if (c.luminance < 0.2 || c.luminance > 0.8) return false;
            return true;
          })
          .sort((a, b) => b.saturation - a.saturation);

        darkPrimary = relaxedSatCandidates[0];
      }

      if (!darkPrimary) {
        // Try 2: Lower contrast threshold (2.0 instead of 2.5)
        const relaxedContrastCandidates = analyzed
          .filter(c => {
            if (c.saturation < 0.15) return false;
            if (usedTextColors.includes(c.hex)) return false;
            const contrastVsSurface = getContrastRatio(c, darkSurfaceForPrimary);
            if (contrastVsSurface < 2.0) return false;
            // Exclude very dark and very light colors for dark mode
            if (c.luminance < 0.2 || c.luminance > 0.8) return false;
            return true;
          })
          .sort((a, b) => b.saturation - a.saturation);

        darkPrimary = relaxedContrastCandidates[0];
      }

      // Try 3: Use light mode primary if it works on dark background
      if (!darkPrimary && lightPrimary) {
        const lpRgb = hexToRgb(lightPrimary.hex);
        if (lpRgb) {
          const contrastVsSurface = getContrastRatio(lpRgb, darkSurfaceForPrimary);
          if (contrastVsSurface >= 2.5) {
            darkPrimary = lightPrimary;
          }
        }
      }

      if (!darkPrimary) {
        // Final fallback: use default blue
        darkPrimary = {
          r: 64, g: 156, b: 255,
          hex: '#409cff',
          luminance: getLuminance(64, 156, 255),
          saturation: getSaturation(64, 156, 255)
        };
      }

      if (darkPrimary && !darkPrimary.isVibrant && darkPrimary.hex !== '#409cff') {
        const moreVibrant = findMostVibrantVariant(
          { r: hexToRgb(darkPrimary.hex).r, g: hexToRgb(darkPrimary.hex).g, b: hexToRgb(darkPrimary.hex).b },
          palette
        );
        if (moreVibrant && getSaturation(moreVibrant.r, moreVibrant.g, moreVibrant.b) > darkPrimary.saturation * 1.2) {
          const newLuminance = getLuminance(moreVibrant.r, moreVibrant.g, moreVibrant.b);
          const newContrast = getContrastRatio(moreVibrant, darkSurfaceForPrimary);
          if (newLuminance > 0.2 && newContrast >= 3) {
            darkPrimary = {
              ...moreVibrant,
              hex: rgbToHex(moreVibrant.r, moreVibrant.g, moreVibrant.b),
              luminance: newLuminance,
              saturation: getSaturation(moreVibrant.r, moreVibrant.g, moreVibrant.b)
            };
          }
        }
      }
    }

    if (darkPrimary) {
      darkTokens.primary = darkPrimary.hex;

      const contrastWithWhite = getContrastRatio(darkPrimary, { r: 255, g: 255, b: 255 });
      const contrastWithBlack = getContrastRatio(darkPrimary, { r: 0, g: 0, b: 0 });

      if (contrastWithWhite >= 4.5) {
        darkTokens.onPrimary = '#ffffff';
      } else if (contrastWithBlack >= 4.5) {
        darkTokens.onPrimary = '#000000';
      } else {
        darkTokens.onPrimary = contrastWithWhite > contrastWithBlack ? '#ffffff' : '#000000';
      }
    } else {
      darkTokens.primary = useColor(null, '#409cff');
      darkTokens.onPrimary = '#000000';
    }

    return { light: lightTokens, dark: darkTokens, warnings };
  }

  // ============================================
  // SAVED PALETTES (localStorage)
  // ============================================

  const STORAGE_KEY = 'idtt_saved_palettes';
  const MAX_SAVED = 5;

  function getSavedPalettes() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error reading saved palettes:', e);
      return [];
    }
  }

  function savePalettes(palettes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(palettes));
    } catch (e) {
      console.error('Error saving palettes:', e);
    }
  }

  function generateId() {
    return 'pal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function savePalette(name, palette, tokens) {
    const palettes = getSavedPalettes();

    const newPalette = {
      id: generateId(),
      name: name || 'Palette ' + new Date().toLocaleString(),
      timestamp: Date.now(),
      palette: palette.map(c => ({
        r: c.r,
        g: c.g,
        b: c.b,
        population: c.population,
        isVibrant: c.isVibrant || false
      })),
      tokens: tokens
    };

    palettes.unshift(newPalette);

    // Keep only the most recent MAX_SAVED
    if (palettes.length > MAX_SAVED) {
      palettes.splice(MAX_SAVED);
    }

    savePalettes(palettes);
    return newPalette;
  }

  function deletePalette(id) {
    const palettes = getSavedPalettes();
    const index = palettes.findIndex(p => p.id === id);
    if (index !== -1) {
      palettes.splice(index, 1);
      savePalettes(palettes);
    }
  }

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  function generateCSSVariables(tokens) {
    const tokenMap = {
      bg: 'bg',
      surface: 'surface',
      border: 'border',
      text: 'text',
      heading: 'heading',
      mutedText: 'muted-text',
      primary: 'primary',
      onPrimary: 'on-primary'
    };

    let css = ':root {\n';
    Object.entries(tokens.light).forEach(([key, value]) => {
      if (value && tokenMap[key]) {
        css += `  --idtt-${tokenMap[key]}: ${value};\n`;
      }
    });
    css += '}\n\n';

    css += '[data-theme="dark"] {\n';
    Object.entries(tokens.dark).forEach(([key, value]) => {
      if (value && tokenMap[key]) {
        css += `  --idtt-${tokenMap[key]}: ${value};\n`;
      }
    });
    css += '}';

    return css;
  }

  // ============================================
  // UI RENDERING
  // ============================================

  let extractedPalette = [];
  let originalPixels = [];
  let lockedPrimaryHex = null;
  let lockedLightBgHex = null;
  let lockedDarkBgHex = null;
  let currentTokens = null;

  /**
   * Render palette swatches
   */
  function renderPalette() {
    const grid = document.getElementById('idtt-palette-grid');

    if (extractedPalette.length === 0) {
      grid.innerHTML = '<div class="idtt-palette-empty">Upload an image to extract colors</div>';
      return;
    }

    grid.innerHTML = extractedPalette.map((color, index) => {
      const hex = rgbToHex(color.r, color.g, color.b);
      const isLocked = lockedPrimaryHex && lockedPrimaryHex.toLowerCase() === hex.toLowerCase();
      // Calculate luminance to determine check icon contrast
      const luminance = getLuminance(color.r, color.g, color.b);
      const contrastClass = luminance > 0.5 ? 'light-bg' : 'dark-bg';

      return `
        <div class="idtt-palette-swatch ${isLocked ? 'locked' : ''} ${contrastClass}"
             data-hex="${hex}"
             data-index="${index}"
             style="background-color: ${hex}"
             title="Click to lock as primary">
        </div>
      `;
    }).join('');

    // Add click handlers for locking primary (always active - click to lock, click again to unlock)
    grid.querySelectorAll('.idtt-palette-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const hex = swatch.dataset.hex;

        if (lockedPrimaryHex === hex) {
          lockedPrimaryHex = null;  // Unlock if clicking same color
        } else {
          lockedPrimaryHex = hex;   // Lock new color
        }

        renderPalette();
        computeAndRender();
      });
    });
  }

  /**
   * Render saved palettes list
   */
  function renderSavedPalettes() {
    const list = document.getElementById('idtt-saved-palettes-list');
    const palettes = getSavedPalettes();

    if (palettes.length === 0) {
      list.innerHTML = '<div class="idtt-saved-empty">No saved palettes yet</div>';
      return;
    }

    list.innerHTML = palettes.map(p => {
      const colors = p.palette.slice(0, 5).map(c =>
        `<div class="idtt-saved-item-color" style="background-color: ${rgbToHex(c.r, c.g, c.b)}"></div>`
      ).join('');

      const date = new Date(p.timestamp).toLocaleDateString();

      return `
        <div class="idtt-saved-item" data-id="${p.id}">
          <div class="idtt-saved-item-info">
            <div class="idtt-saved-item-name">${escapeHtml(p.name)}</div>
            <div class="idtt-saved-item-date">${date}</div>
          </div>
          <div class="idtt-saved-item-colors">${colors}</div>
          <button class="idtt-saved-item-delete" data-id="${p.id}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.idtt-saved-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.idtt-saved-item-delete')) return;

        const id = item.dataset.id;
        const palette = palettes.find(p => p.id === id);
        if (palette) {
          loadPalette(palette);
        }
      });
    });

    list.querySelectorAll('.idtt-saved-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('Delete this saved palette?')) {
          deletePalette(id);
          renderSavedPalettes();
        }
      });
    });
  }

  /**
   * Load a saved palette
   */
  function loadPalette(saved) {
    extractedPalette = saved.palette;
    lockedPrimaryHex = null;
    lockedLightBgHex = null;
    lockedDarkBgHex = null;

    document.getElementById('idtt-save-palette-btn').disabled = false;

    renderPalette();
    computeAndRender();
  }

  /**
   * Escape HTML for safe display
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Calculate contrast checks for a token set
   * Checks text contrast against both bg and surface since preview displays on both
   */
  function getContrastChecks(tokens) {
    const surface = hexToRgb(tokens.surface);
    const bg = hexToRgb(tokens.bg);
    const checks = [];

    // Text vs Background checks (main preview area)
    if (tokens.heading && bg) {
      const headingRgb = hexToRgb(tokens.heading);
      const ratio = getContrastRatio(headingRgb, bg);
      checks.push({
        label: 'heading/bg',
        ratio: ratio,
        required: 4.5,
        pass: ratio >= 4.5
      });
    }

    if (tokens.text && bg) {
      const textRgb = hexToRgb(tokens.text);
      const ratio = getContrastRatio(textRgb, bg);
      checks.push({
        label: 'text/bg',
        ratio: ratio,
        required: 4.5,
        pass: ratio >= 4.5
      });
    }

    if (tokens.mutedText && bg) {
      const mutedRgb = hexToRgb(tokens.mutedText);
      const ratio = getContrastRatio(mutedRgb, bg);
      checks.push({
        label: 'mutedText/bg',
        ratio: ratio,
        required: 3.0,
        pass: ratio >= 3.0,
        warn: ratio >= 3.0 && ratio < 4.5
      });
    }

    // Text vs Surface checks (feature card area)
    if (tokens.heading && surface) {
      const headingRgb = hexToRgb(tokens.heading);
      const ratio = getContrastRatio(headingRgb, surface);
      checks.push({
        label: 'heading/surface',
        ratio: ratio,
        required: 4.5,
        pass: ratio >= 4.5
      });
    }

    if (tokens.text && surface) {
      const textRgb = hexToRgb(tokens.text);
      const ratio = getContrastRatio(textRgb, surface);
      checks.push({
        label: 'text/surface',
        ratio: ratio,
        required: 4.5,
        pass: ratio >= 4.5
      });
    }

    // Primary button contrast
    if (tokens.primary && tokens.onPrimary) {
      const primaryRgb = hexToRgb(tokens.primary);
      const onPrimaryRgb = hexToRgb(tokens.onPrimary);
      const ratio = getContrastRatio(primaryRgb, onPrimaryRgb);
      checks.push({
        label: 'onPrimary/primary',
        ratio: ratio,
        required: 4.5,
        pass: ratio >= 4.5
      });
    }

    return checks;
  }

  /**
   * Render contrast checks UI
   */
  function renderContrastChecks(checks) {
    return checks.map(check => `
      <div class="idtt-contrast-row">
        <span class="idtt-contrast-label">${check.label}</span>
        <span class="idtt-contrast-value">${check.ratio.toFixed(2)}:1</span>
        <span class="idtt-contrast-badge ${check.pass ? (check.warn ? 'warn' : 'pass') : 'fail'}">
          ${check.pass ? (check.warn ? 'AA' : 'PASS') : 'FAIL'}
        </span>
      </div>
    `).join('');
  }

  /**
   * Render token table
   */
  function renderTokenTable(tokens, mode) {
    const tokenOrder = ['bg', 'surface', 'border', 'text', 'heading', 'mutedText', 'primary', 'onPrimary'];

    return `
      <table class="idtt-token-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Color</th>
            <th>Hex</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${tokenOrder.map(token => {
            const hex = tokens[token] || '—';
            return `
              <tr>
                <td><strong>${token}</strong></td>
                <td><div class="idtt-token-swatch" style="background-color: ${hex}"></div></td>
                <td class="idtt-token-hex">${hex}</td>
                <td>
                  <button class="idtt-copy-btn" data-hex="${hex}" data-token="${token}" data-mode="${mode}">
                    Copy
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Render preview section
   */
  function renderPreview(tokens, mode, bgCandidates = [], lockedBgHex = null) {
    const checks = getContrastChecks(tokens);
    const modeLabel = mode === 'light' ? 'Light Mode' : 'Dark Mode';
    const modeIcon = mode === 'light'
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

    // Render background swatches if candidates available
    const bgSwatchesHtml = bgCandidates.length > 0 ? `
      <div class="idtt-bg-selector" data-mode="${mode}">
        <div class="idtt-bg-selector-label">Background Options:</div>
        <div class="idtt-bg-swatches">
          ${bgCandidates.slice(0, 6).map(c => {
            const isLocked = lockedBgHex && lockedBgHex.toLowerCase() === c.hex.toLowerCase();
            const contrastClass = c.luminance > 0.5 ? 'light-bg' : 'dark-bg';
            return `
              <div class="idtt-bg-swatch ${isLocked ? 'locked' : ''} ${contrastClass}"
                   data-hex="${c.hex}"
                   data-mode="${mode}"
                   style="background-color: ${c.hex}"
                   title="${c.hex}">
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    return `
      <div class="idtt-preview-card">
        <div class="idtt-preview-header">${modeIcon} ${modeLabel}</div>
        <div class="idtt-preview-section" style="background-color: ${tokens.bg || '#f7f7f7'}">
          <div class="idtt-preview-eyebrow" style="color: ${tokens.mutedText || '#666'}">
            Featured Section
          </div>
          <div class="idtt-preview-heading" style="color: ${tokens.heading || '#000'}">
            Design System Preview
          </div>
          <div class="idtt-preview-body" style="color: ${tokens.text || '#333'}">
            This preview demonstrates how your extracted color palette translates into a cohesive design system with proper contrast ratios for accessibility compliance.
          </div>
          <div class="idtt-preview-button" style="background-color: ${tokens.primary || '#0071e3'}; color: ${tokens.onPrimary || '#fff'}">
            Primary Action
          </div>
          <div class="idtt-preview-feature-card" style="
            background-color: ${tokens.surface || '#fff'};
            border: 1px solid ${tokens.border || '#e0e0e0'};
          ">
            <div class="idtt-preview-feature-title" style="color: ${tokens.heading || '#000'}">
              Feature Card
            </div>
            <div class="idtt-preview-feature-text" style="color: ${tokens.text || '#333'}">
              Cards use the surface and border tokens.
            </div>
          </div>
        </div>

        ${bgSwatchesHtml}

        <div style="padding: 16px; background: var(--idtt-surface);">
          <h3 style="margin-bottom: 12px;">Contrast Checks</h3>
          <div class="idtt-contrast-checks">
            ${renderContrastChecks(checks)}
          </div>

          <h3 style="margin: 16px 0 12px 0;">Token Values</h3>
          ${renderTokenTable(tokens, mode)}
        </div>
      </div>
    `;
  }

  /**
   * Main render function
   */
  function computeAndRender() {
    if (extractedPalette.length === 0) {
      document.getElementById('idtt-preview-area').innerHTML = `
        <div class="idtt-empty-state">
          <div class="idtt-empty-state-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
          <h3>No palette generated yet</h3>
          <p>Upload an image to get started</p>
        </div>
      `;
      document.getElementById('idtt-export-actions').style.display = 'none';
      document.getElementById('idtt-promptless-cta').style.display = 'none';
      return;
    }

    const result = generateTokens(extractedPalette, lockedPrimaryHex, lockedLightBgHex, lockedDarkBgHex);
    currentTokens = result;

    // Analyze palette for background filtering
    const analyzedPalette = extractedPalette.map(c => ({
      ...c,
      hex: rgbToHex(c.r, c.g, c.b),
      luminance: getLuminance(c.r, c.g, c.b),
      saturation: getSaturation(c.r, c.g, c.b)
    }));

    // Get valid background candidates for each mode
    // Pass tokens so we can check contrast against actual text colors
    const lightBgCandidates = filterLightBgCandidates(analyzedPalette, result.light);
    const darkBgCandidates = filterDarkBgCandidates(analyzedPalette, result.dark);

    // Show warnings
    const warningBanner = document.getElementById('idtt-warning-banner');
    if (result.warnings.length > 0) {
      warningBanner.innerHTML = `
        <strong>Warnings:</strong><br>
        ${result.warnings.map(w => '• ' + w).join('<br>')}
      `;
      warningBanner.classList.add('visible');
    } else {
      warningBanner.classList.remove('visible');
    }

    // Render previews with background candidates
    document.getElementById('idtt-preview-area').innerHTML = `
      <div class="idtt-preview-container">
        ${renderPreview(result.light, 'light', lightBgCandidates, lockedLightBgHex)}
        ${renderPreview(result.dark, 'dark', darkBgCandidates, lockedDarkBgHex)}
      </div>
    `;

    // Show export actions and CTA
    document.getElementById('idtt-export-actions').style.display = 'flex';
    document.getElementById('idtt-promptless-cta').style.display = 'block';

    // Add copy button handlers with fallback for non-HTTPS
    document.querySelectorAll('.idtt-copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const hex = btn.dataset.hex;
        const copyToClipboard = (text) => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
          }
          // Fallback for non-HTTPS contexts
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          return Promise.resolve();
        };

        copyToClipboard(hex).then(() => {
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => btn.textContent = original, 1000);
        }).catch(() => {
          // Silent fail - button just won't show "Copied!"
        });
      });
    });

    // Add background swatch click handlers
    document.querySelectorAll('.idtt-bg-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const hex = swatch.dataset.hex;
        const mode = swatch.dataset.mode;

        if (mode === 'light') {
          // Toggle: click same color to unlock, different color to lock
          if (lockedLightBgHex === hex) {
            lockedLightBgHex = null;
          } else {
            lockedLightBgHex = hex;
          }
        } else if (mode === 'dark') {
          if (lockedDarkBgHex === hex) {
            lockedDarkBgHex = null;
          } else {
            lockedDarkBgHex = hex;
          }
        }

        // Re-render with new locked background
        computeAndRender();
      });
    });
  }

  // ============================================
  // IMAGE PROCESSING
  // ============================================

  function processImage(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Show thumbnail
        const thumbnail = document.getElementById('idtt-thumbnail');
        thumbnail.src = e.target.result;
        document.getElementById('idtt-thumbnail-container').classList.add('visible');

        // Downscale for processing
        const canvas = document.getElementById('idtt-processing-canvas');
        const ctx = canvas.getContext('2d');

        const maxSize = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = extractPixels(imageData);

        originalPixels = pixels;

        let palette = medianCut(pixels, 20);
        palette = removeDuplicates(palette, 30);

        // Pass 1: Extract vibrant colors (population-based)
        const vibrantColors = extractVibrantColors(pixels, palette);

        if (vibrantColors.length > 0) {
          palette = [...palette, ...vibrantColors];
          palette = removeDuplicates(palette, 45);
        }

        // Pass 2: Extract brand colors (saturation-based, no population requirement)
        const brandColors = extractBrandColors(pixels, palette);

        if (brandColors.length > 0) {
          palette = [...palette, ...brandColors];
          palette = removeDuplicates(palette, 40);
        }

        palette.sort((a, b) => {
          const aBoost = a.isBrandColor ? 2.5 : (a.isVibrant ? 2.0 : 1);
          const bBoost = b.isBrandColor ? 2.5 : (b.isVibrant ? 2.0 : 1);
          return (b.population * bBoost) - (a.population * aBoost);
        });

        extractedPalette = palette.slice(0, 16);

        // Enable buttons
        document.getElementById('idtt-save-palette-btn').disabled = false;

        // Reset locked colors
        lockedPrimaryHex = null;
        lockedLightBgHex = null;
        lockedDarkBgHex = null;

        // Render
        renderPalette();
        computeAndRender();
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  // ============================================
  // SAVE PALETTE MODAL
  // ============================================

  function showSaveModal() {
    const overlay = document.createElement('div');
    overlay.className = 'idtt-modal-overlay';
    overlay.innerHTML = `
      <div class="idtt-modal">
        <h3>Save Palette</h3>
        <input type="text" class="idtt-modal-input" id="idtt-palette-name" placeholder="Enter a name for this palette">
        <div class="idtt-modal-actions">
          <button class="idtt-btn idtt-btn-secondary" id="idtt-modal-cancel">Cancel</button>
          <button class="idtt-btn idtt-btn-primary" id="idtt-modal-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('idtt-palette-name');
    input.focus();
    input.value = 'Palette ' + new Date().toLocaleDateString();
    input.select();

    document.getElementById('idtt-modal-cancel').addEventListener('click', () => {
      overlay.remove();
    });

    document.getElementById('idtt-modal-save').addEventListener('click', () => {
      const name = input.value.trim() || 'Unnamed Palette';
      savePalette(name, extractedPalette, currentTokens);
      renderSavedPalettes();
      overlay.remove();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('idtt-modal-save').click();
      } else if (e.key === 'Escape') {
        overlay.remove();
      }
    });
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('idtt-upload-zone');
    const fileInput = document.getElementById('idtt-file-input');
    const savePaletteBtn = document.getElementById('idtt-save-palette-btn');
    const copyCssBtn = document.getElementById('idtt-copy-css-btn');

    // File input change
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) processImage(file);
    });

    // Upload zone click
    uploadZone.addEventListener('click', () => fileInput.click());

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        processImage(file);
      }
    });

    // Save palette button
    savePaletteBtn.addEventListener('click', () => {
      if (extractedPalette.length > 0 && currentTokens) {
        showSaveModal();
      }
    });

    // Copy CSS Variables button
    if (copyCssBtn) {
      copyCssBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (currentTokens) {
          const css = generateCSSVariables(currentTokens);

          // Helper function to show copied feedback
          const showCopiedFeedback = () => {
            const original = copyCssBtn.textContent;
            copyCssBtn.textContent = 'Copied!';
            setTimeout(() => copyCssBtn.textContent = original, 1500);
          };

          // Use clipboard API if available (requires HTTPS), otherwise fallback
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(css).then(() => {
              showCopiedFeedback();
            }).catch(() => {
              // Fallback if clipboard API fails
              copyWithFallback(css);
              showCopiedFeedback();
            });
          } else {
            // Fallback for non-HTTPS or older browsers
            copyWithFallback(css);
            showCopiedFeedback();
          }
        }
      });
    }

    // Fallback copy function for non-HTTPS environments
    function copyWithFallback(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textarea);
    }

    // Initialize saved palettes list
    renderSavedPalettes();
  });

})();
