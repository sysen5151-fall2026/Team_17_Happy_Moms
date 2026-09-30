/* ==========================================================================
   Happy Moms — chart helpers
   Hand-authored SVG, no libraries. Every function returns an SVG string that
   scales with its container and takes its colours from the CSS theme tokens.
   ========================================================================== */
window.HM = window.HM || {};

HM.charts = (function () {
  "use strict";

  var esc = function (v) { return HM.dom.escapeHtml(v); };

  function niceDomain(values, fallbackMin, fallbackMax) {
    var nums = HM.stats.numbers(values);
    if (!nums.length) return [fallbackMin || 0, fallbackMax || 1];
    var min = Math.min.apply(null, nums);
    var max = Math.max.apply(null, nums);
    if (fallbackMin !== undefined && fallbackMin !== null) min = Math.min(min, fallbackMin);
    if (fallbackMax !== undefined && fallbackMax !== null) max = Math.max(max, fallbackMax);
    if (min === max) { min = min - 1; max = max + 1; }
    return [min, max];
  }

  /* ------------------------------------------------------------ line chart */
  /* points: [{ label, value }] where value may be null for a missed day. */
  function line(points, options) {
    var opt = options || {};
    var W = 640, H = opt.height || 190;
    var padL = 34, padR = 12, padT = 14, padB = 26;
    var domain = opt.domain || niceDomain(points.map(function (p) { return p.value; }));
    var lo = domain[0], hi = domain[1];
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;
    var accent = opt.accent || "var(--chart-1)";

    function x(i) {
      return points.length <= 1 ? padL + innerW / 2
        : padL + (i / (points.length - 1)) * innerW;
    }
    function y(v) {
      return padT + innerH - ((v - lo) / (hi - lo)) * innerH;
    }

    /* Grid and y labels at low, middle, high. */
    var ticks = [lo, (lo + hi) / 2, hi];
    var grid = ticks.map(function (t) {
      var yy = y(t).toFixed(1);
      var label = opt.tickFormat ? opt.tickFormat(t) : String(HM.stats.round(t, 1));
      return '<line class="grid" x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '"/>' +
        '<text class="axis" x="' + (padL - 8) + '" y="' + yy + '" text-anchor="end" dominant-baseline="middle">' +
        esc(label) + "</text>";
    }).join("");

    /* Break the line wherever a day has no entry. */
    var segments = [];
    var current = [];
    points.forEach(function (p, i) {
      if (p.value === null || p.value === undefined || isNaN(p.value)) {
        if (current.length) { segments.push(current); current = []; }
      } else {
        current.push([x(i), y(p.value)]);
      }
    });
    if (current.length) segments.push(current);

    var paths = segments.map(function (seg) {
      if (seg.length === 1) return "";
      var d = seg.map(function (pt, i) {
        return (i === 0 ? "M" : "L") + pt[0].toFixed(1) + "," + pt[1].toFixed(1);
      }).join(" ");
      return '<path class="series" d="' + d + '" fill="none" stroke="' + accent + '"/>';
    }).join("");

    /* Area fill under the longest segment reads as one shape, so only fill
       when the data is continuous enough to be honest about it. */
    var area = "";
    if (segments.length === 1 && segments[0].length > 1) {
      var seg0 = segments[0];
      var dArea = "M" + seg0[0][0].toFixed(1) + "," + (padT + innerH) +
        seg0.map(function (pt) { return " L" + pt[0].toFixed(1) + "," + pt[1].toFixed(1); }).join("") +
        " L" + seg0[seg0.length - 1][0].toFixed(1) + "," + (padT + innerH) + " Z";
      area = '<path d="' + dArea + '" fill="' + accent + '" opacity="0.12"/>';
    }

    var dots = points.map(function (p, i) {
      if (p.value === null || p.value === undefined || isNaN(p.value)) return "";
      var last = i === points.length - 1;
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) +
        '" r="' + (last ? 4.2 : 2.6) + '" fill="' + accent +
        (last ? '" stroke="var(--surface)" stroke-width="1.6"' : '"') + "/>";
    }).join("");

    /* First, middle and last date labels only, to avoid a crowded axis. */
    var xIdx = points.length > 2 ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [0, points.length - 1];
    var xLabels = xIdx.map(function (i) {
      if (!points[i]) return "";
      var anchor = i === 0 ? "start" : (i === points.length - 1 ? "end" : "middle");
      return '<text class="axis" x="' + x(i).toFixed(1) + '" y="' + (H - 7) +
        '" text-anchor="' + anchor + '">' + esc(points[i].label) + "</text>";
    }).join("");

    var described = opt.ariaLabel || "Line chart";

    return '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(described) + '">' +
      grid + area + paths + dots + xLabels + "</svg>";
  }

  /* ------------------------------------------------------------ bar chart */
  /* items: [{ label, value }], horizontal bars sorted by the caller. */
  function bars(items, options) {
    var opt = options || {};
    var rowH = 30;
    var W = 640;
    var H = Math.max(rowH, items.length * rowH) + 8;
    var labelW = opt.labelWidth || 190;
    var valueW = 46;
    var trackW = W - labelW - valueW - 12;
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var accent = opt.accent || "var(--chart-2)";

    var rows = items.map(function (item, i) {
      var yTop = i * rowH + 6;
      var w = Math.max(3, (item.value / max) * trackW);
      return '<text class="bar-label" x="0" y="' + (yTop + 11) + '" dominant-baseline="middle">' +
          esc(item.label) + "</text>" +
        '<rect class="bar-track" x="' + labelW + '" y="' + (yTop + 3) + '" width="' + trackW +
          '" height="16" rx="8"/>' +
        '<rect x="' + labelW + '" y="' + (yTop + 3) + '" width="' + w.toFixed(1) +
          '" height="16" rx="8" fill="' + accent + '"/>' +
        '<text class="bar-value" x="' + W + '" y="' + (yTop + 11) +
          '" text-anchor="end" dominant-baseline="middle">' + esc(item.value) + "</text>";
    }).join("");

    return '<svg class="chart chart-bars" viewBox="0 0 ' + W + " " + H +
      '" role="img" aria-label="' + esc(opt.ariaLabel || "Bar chart") + '">' + rows + "</svg>";
  }

  /* ----------------------------------------------------------- ring gauge */
  function ring(percent, options) {
    var opt = options || {};
    var pct = Math.max(0, Math.min(100, percent || 0));
    var size = 132, stroke = 12, r = (size - stroke) / 2, c = size / 2;
    var circumference = 2 * Math.PI * r;
    var filled = (pct / 100) * circumference;
    var accent = opt.accent || "var(--chart-1)";

    return '<svg class="chart-ring" viewBox="0 0 ' + size + " " + size +
        '" role="img" aria-label="' + esc(opt.ariaLabel || (pct + " percent")) + '">' +
      '<circle class="ring-track" cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + accent +
        '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' +
        filled.toFixed(1) + " " + circumference.toFixed(1) + '" transform="rotate(-90 ' + c + " " + c + ')"/>' +
      '<text class="ring-value" x="' + c + '" y="' + (c - 2) + '" text-anchor="middle">' +
        Math.round(pct) + "%</text>" +
      '<text class="ring-caption" x="' + c + '" y="' + (c + 18) + '" text-anchor="middle">' +
        esc(opt.caption || "") + "</text>" +
      "</svg>";
  }

  /* --------------------------------------------------------- mini sparkline */
  function spark(values, options) {
    var opt = options || {};
    var nums = values.slice();
    var W = 160, H = 40, pad = 3;
    var domain = opt.domain || niceDomain(nums);
    var lo = domain[0], hi = domain[1];
    var accent = opt.accent || "var(--chart-1)";
    var pts = [];

    nums.forEach(function (v, i) {
      if (v === null || v === undefined || isNaN(v)) return;
      var x = pad + (nums.length <= 1 ? (W - pad * 2) / 2 : (i / (nums.length - 1)) * (W - pad * 2));
      var y = pad + (H - pad * 2) - ((v - lo) / (hi - lo)) * (H - pad * 2);
      pts.push([x, y]);
    });

    if (pts.length < 2) {
      return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' +
        esc(opt.ariaLabel || "Not enough data yet") + '"><text class="axis" x="' + (W / 2) +
        '" y="' + (H / 2 + 4) + '" text-anchor="middle">Not enough data yet</text></svg>';
    }

    var d = pts.map(function (p, i) {
      return (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1);
    }).join(" ");
    var last = pts[pts.length - 1];

    return '<svg class="spark" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' +
      esc(opt.ariaLabel || "Recent trend") + '">' +
      '<path d="' + d + '" fill="none" stroke="' + accent + '" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) +
      '" r="3" fill="' + accent + '"/></svg>';
  }

  return { line: line, bars: bars, ring: ring, spark: spark, niceDomain: niceDomain };
})();
