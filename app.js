const STORAGE_KEY = "tutor-income-records";
    const LEGACY_STORAGE_KEY_PATTERN = /^tutor-income-records-v\d+$/;
    const $ = (id) => document.getElementById(id);

    let records = loadRecords();
    let viewDate = new Date();
    let selectedDate = toDateKey(new Date());
    let editingId = null;
    let currentPage = "home";
    let chartMode = "daily";
    let currentDayKey = toDateKey(new Date());
    let chartHitRegions = [];
    let selectedChartPoint = null;

    const els = {
      todayText: $("todayText"), todayBtn: $("todayBtn"), exportTopBtn: $("exportTopBtn"),
      heroMonth: $("heroMonth"), monthIncome: $("monthIncome"), monthHours: $("monthHours"), monthCount: $("monthCount"), avgRate: $("avgRate"),
      homePage: $("homePage"), statsPage: $("statsPage"), homeNav: $("homeNav"), statsNav: $("statsNav"),
      monthTitle: $("monthTitle"), prevMonth: $("prevMonth"), nextMonth: $("nextMonth"), thisMonthBtn: $("thisMonthBtn"),
      calendarGrid: $("calendarGrid"), selectedTitle: $("selectedTitle"), selectedTotal: $("selectedTotal"), records: $("records"),
      dailyTab: $("dailyTab"), weeklyTab: $("weeklyTab"), monthlyTab: $("monthlyTab"), chartRangeText: $("chartRangeText"),
      incomeChart: $("incomeChart"), chartDetail: $("chartDetail"), chartTotal: $("chartTotal"), chartMax: $("chartMax"), chartAvg: $("chartAvg"),
      weeklyHint: $("weeklyHint"), weekList: $("weekList"), recordCountText: $("recordCountText"),
      queryStart: $("queryStart"), queryEnd: $("queryEnd"), queryKeyword: $("queryKeyword"),
      runQueryBtn: $("runQueryBtn"), resetQueryBtn: $("resetQueryBtn"),
      queryCount: $("queryCount"), queryIncome: $("queryIncome"), queryHours: $("queryHours"), queryAvg: $("queryAvg"), queryDetails: $("queryDetails"),
      addBtn: $("addBtn"), mask: $("mask"), sheet: $("sheet"), closeBtn: $("closeBtn"), formTitle: $("formTitle"),
      student: $("student"), course: $("course"), date: $("date"), hours: $("hours"), rate: $("rate"), note: $("note"), previewIncome: $("previewIncome"),
      saveBtn: $("saveBtn"), deleteBtn: $("deleteBtn"), toast: $("toast"),
      exportBtn: $("exportBtn"), importBtn: $("importBtn"), importFile: $("importFile"),
    };

    init();

    function init() {
      els.todayText.textContent = formatFullDate(new Date());
      setDefaultQueryRange();
      bindEvents();
      render();
      startDateWatcher();
    }

    function bindEvents() {
      els.prevMonth.addEventListener("click", () => changeMonth(-1));
      els.nextMonth.addEventListener("click", () => changeMonth(1));
      els.thisMonthBtn.addEventListener("click", goToday);
      els.todayBtn.addEventListener("click", goToday);
      els.addBtn.addEventListener("click", () => openSheet());
      els.closeBtn.addEventListener("click", closeSheet);
      els.mask.addEventListener("click", closeSheet);
      els.saveBtn.addEventListener("click", saveRecord);
      els.deleteBtn.addEventListener("click", deleteRecord);
      els.exportBtn.addEventListener("click", exportBackup);
      els.exportTopBtn.addEventListener("click", exportBackup);
      els.importBtn.addEventListener("click", () => els.importFile.click());
      els.importFile.addEventListener("change", importBackup);
      [els.hours, els.rate].forEach(input => input.addEventListener("input", updatePreview));
      els.homeNav.addEventListener("click", () => switchPage("home"));
      els.statsNav.addEventListener("click", () => switchPage("stats"));
      els.runQueryBtn.addEventListener("click", renderQuery);
      els.resetQueryBtn.addEventListener("click", () => {
        setDefaultQueryRange();
        renderQuery();
      });
      [els.dailyTab, els.weeklyTab, els.monthlyTab].forEach(btn => {
        btn.addEventListener("click", () => {
          chartMode = btn.dataset.mode;
          selectedChartPoint = null;
          renderChart();
        });
      });
      els.incomeChart.addEventListener("click", handleChartClick);
      window.addEventListener("resize", () => renderChart());
      const colorSchemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
      colorSchemeQuery?.addEventListener?.("change", () => renderChart());
    }

    function switchPage(page) {
      currentPage = page;
      els.homePage.classList.toggle("active", page === "home");
      els.statsPage.classList.toggle("active", page === "stats");
      els.homeNav.classList.toggle("active", page === "home");
      els.statsNav.classList.toggle("active", page === "stats");
      if (page === "stats") {
        setTimeout(renderChart, 30);
        renderQuery();
      }
    }

    function changeMonth(delta) {
      viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
      render();
    }

    function goToday() {
      const today = new Date();
      viewDate = today;
      selectedDate = toDateKey(today);
      render();
    }

    function render() {
      renderSummary();
      renderCalendar();
      renderRecords();
      renderWeekList();
      renderChart();
      renderQuery();
      els.recordCountText.textContent = `${records.length}条`;
    }

    function renderSummary() {
      const monthRecords = getCurrentMonthRecords();
      const income = sum(monthRecords.map(getIncome));
      const hours = sum(monthRecords.map(r => Number(r.hours) || 0));
      const avg = hours > 0 ? income / hours : 0;
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();

      els.heroMonth.textContent = `${y}年${m + 1}月收入`;
      els.monthIncome.textContent = money(income);
      els.monthHours.textContent = `${round(hours)}h`;
      els.monthCount.textContent = String(monthRecords.length);
      els.avgRate.textContent = money(avg);
      els.monthTitle.textContent = `${y}年${m + 1}月`;
      els.weeklyHint.textContent = getWeekRangeLabel(getWeekStart(new Date()));
    }

    function renderCalendar() {
      els.calendarGrid.innerHTML = "";
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();
      const todayKey = toDateKey(new Date());
      const incomeByDate = getIncomeByDate();
      const days = buildMonthCalendarDays(y, m);

      days.forEach(dayInfo => {
        const cell = document.createElement(dayInfo.inMonth ? "button" : "div");
        cell.className = dayInfo.inMonth ? "day" : "day empty";
        if (dayInfo.inMonth) {
          cell.type = "button";
          if (dayInfo.key === todayKey) cell.classList.add("today");
          if (dayInfo.key === selectedDate) cell.classList.add("selected");
        }

        const num = document.createElement("div");
        num.className = "day-num";
        num.textContent = dayInfo.date.getDate();

        const income = document.createElement("div");
        income.className = "day-income";
        income.textContent = dayInfo.inMonth && incomeByDate[dayInfo.key] ? money(incomeByDate[dayInfo.key]) : "";

        cell.append(num, income);
        if (dayInfo.inMonth) {
          cell.addEventListener("click", () => {
            selectedDate = dayInfo.key;
            renderCalendar();
            renderRecords();
          });
        }
        els.calendarGrid.appendChild(cell);
      });
    }

    function renderRecords() {
      const dayRecords = records
        .filter(r => r.date === selectedDate)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const total = sum(dayRecords.map(getIncome));

      els.selectedTitle.textContent = formatSelectedTitle(selectedDate);
      els.selectedTotal.textContent = money(total);
      els.records.innerHTML = "";

      if (dayRecords.length === 0) {
        els.records.innerHTML = `<div class="empty-state">这一天还没有记录。<br/>点击下方按钮添加一节课。</div>`;
        return;
      }

      dayRecords.forEach(r => {
        const item = document.createElement("article");
        item.className = "record";
        item.innerHTML = `
          <div>
            <h3>${escapeHTML(getRecordTitle(r))}</h3>
            <p>${formatShortDate(parseLocalDate(r.date))} · ${round(r.hours)}小时 × ${money(r.rate)} / 小时</p>
            ${r.note ? `<p>${escapeHTML(r.note)}</p>` : ""}
          </div>
          <div class="money">${money(getIncome(r))}</div>
        `;
        item.addEventListener("click", () => openSheet(r));
        els.records.appendChild(item);
      });
    }

    function renderWeekList() {
      const weekStart = getWeekStart(new Date());
      const weekEnd = addDays(weekStart, 6);
      const weekRecords = getRecordsBetween(weekStart, weekEnd).sort((a, b) => String(a.date).localeCompare(String(b.date)) || (b.createdAt || 0) - (a.createdAt || 0));
      const income = sum(weekRecords.map(getIncome));
      els.weekList.innerHTML = "";
      const item = document.createElement("article");
      item.className = "week-item";
      item.innerHTML = `
        <div class="week-top">
          <div><b>${formatWeekRange(weekStart, weekEnd)}</b><span> · 本周</span></div>
          <strong>${money(income)}</strong>
        </div>
        <div class="week-bar"><i style="width:${income > 0 ? 100 : 0}%;"></i></div>
      `;
      els.weekList.appendChild(item);
    }

    function renderChart() {
      const tabs = { daily: els.dailyTab, weekly: els.weeklyTab, monthly: els.monthlyTab };
      Object.entries(tabs).forEach(([mode, btn]) => btn.classList.toggle("active", mode === chartMode));

      const data = getChartData(chartMode);
      drawChart(data);
      const values = data.map(d => d.value);
      const total = sum(values);
      const max = Math.max(0, ...values);
      const nonEmpty = values.filter(v => v > 0);
      const avg = nonEmpty.length ? total / nonEmpty.length : 0;

      els.chartTotal.textContent = money(total);
      els.chartMax.textContent = money(max);
      els.chartAvg.textContent = money(avg);
      els.chartRangeText.textContent = data.rangeText;
      if (selectedChartPoint && !data.some(d => d.id === selectedChartPoint.id)) {
        selectedChartPoint = null;
      }
      renderChartDetail(selectedChartPoint);
    }

    function getChartData(mode) {
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();
      const incomeByDate = getIncomeByDate();

      if (mode === "daily") {
        const lastDay = new Date(y, m + 1, 0).getDate();
        const points = Array.from({ length: lastDay }, (_, i) => {
          const d = new Date(y, m, i + 1);
          const key = toDateKey(d);
          const dayRecords = records.filter(r => r.date === key);
          return {
            id: `daily-${key}`,
            label: String(i + 1),
            title: `${m + 1}月${i + 1}日`,
            range: formatFullDate(d),
            value: incomeByDate[key] || 0,
            hours: sum(dayRecords.map(r => Number(r.hours) || 0)),
            count: dayRecords.length,
            records: dayRecords,
          };
        });
        points.rangeText = `${y}年${m + 1}月 · 每天`;
        return points;
      }

      if (mode === "weekly") {
        const weeks = getRecentWeeks(5, new Date());
        const points = weeks.map((week) => {
          const weekRecords = getRecordsBetween(week.start, week.end);
          return {
            id: `weekly-${toDateKey(week.start)}`,
            label: formatWeekShortLabel(week.start, week.end),
            title: formatWeekRange(week.start, week.end),
            range: `${formatFullDate(week.start)} 至 ${formatFullDate(week.end)}`,
            value: sum(weekRecords.map(getIncome)),
            hours: sum(weekRecords.map(r => Number(r.hours) || 0)),
            count: weekRecords.length,
            records: weekRecords,
          };
        });
        points.rangeText = `最近五周 · 周一至周日`;
        return points;
      }

      const points = Array.from({ length: 12 }, (_, i) => {
        const monthRecords = records.filter(r => {
          const d = parseLocalDate(r.date);
          return d.getFullYear() === y && d.getMonth() === i;
        });
        return {
          id: `monthly-${y}-${i + 1}`,
          label: `${i + 1}月`,
          title: `${y}年${i + 1}月`,
          range: `${y}年${i + 1}月`,
          value: sum(monthRecords.map(getIncome)),
          hours: sum(monthRecords.map(r => Number(r.hours) || 0)),
          count: monthRecords.length,
          records: monthRecords,
        };
      });
      points.rangeText = `${y}年 · 每月`;
      return points;
    }

    function drawChart(data) {
      const canvas = els.incomeChart;
      if (!canvas) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      chartHitRegions = [];

      const width = rect.width;
      const height = rect.height;
      const pad = { top: 24, right: 15, bottom: chartMode === "weekly" ? 52 : 38, left: 42 };
      const plotW = width - pad.left - pad.right;
      const plotH = height - pad.top - pad.bottom;
      const maxValue = Math.max(1, ...data.map(d => d.value));

      const theme = getThemeColors();
      ctx.strokeStyle = theme.chartLine;
      ctx.lineWidth = 1;
      ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = theme.chartLabel;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      for (let i = 0; i <= 3; i++) {
        const y = pad.top + plotH * i / 3;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        const label = money(maxValue * (3 - i) / 3).replace("¥", "");
        ctx.fillText(label, pad.left - 8, y);
      }

      let gap = chartMode === "daily" ? 3 : 8;
      let barW;
      let slotW = 0;
      let startX = pad.left;
      if (chartMode === "weekly") {
        slotW = plotW / Math.max(1, data.length);
        barW = Math.max(18, Math.min(32, slotW * 0.42));
      } else {
        barW = Math.max(3, Math.min(28, (plotW - gap * (data.length - 1)) / Math.max(1, data.length)));
        const totalBarW = barW * data.length + gap * (data.length - 1);
        startX = pad.left + Math.max(0, (plotW - totalBarW) / 2);
      }

      const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      gradient.addColorStop(0, theme.primary);
      gradient.addColorStop(1, theme.green);

      data.forEach((d, i) => {
        const x = chartMode === "weekly"
          ? pad.left + slotW * i + (slotW - barW) / 2
          : startX + (barW + gap) * i;
        const h = d.value > 0 ? Math.max(3, d.value / maxValue * plotH) : 0;
        const y = pad.top + plotH - h;
        const isSelected = selectedChartPoint && selectedChartPoint.id === d.id;

        const hitX = chartMode === "weekly" ? pad.left + slotW * i : x - gap / 2;
        const hitW = chartMode === "weekly" ? slotW : barW + gap;
        chartHitRegions.push({ x: hitX, y: pad.top, w: hitW, h: plotH + 34, point: d });

        if (isSelected) {
          ctx.fillStyle = theme.primarySoft;
          roundRect(ctx, x - 3, pad.top - 6, barW + 6, plotH + 12, 10);
          ctx.fill();
        }

        roundRect(ctx, x, y, barW, h, Math.min(7, barW / 2));
        ctx.fillStyle = gradient;
        ctx.fill();

        const shouldLabel = chartMode !== "daily" || i === 0 || i === data.length - 1 || (i + 1) % 5 === 0;
        if (shouldLabel) {
          ctx.save();
          ctx.fillStyle = isSelected ? theme.primary : theme.chartLabel;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.font = `${isSelected ? "700" : "500"} 10.5px -apple-system, BlinkMacSystemFont, sans-serif`;
          const labelX = x + barW / 2;
          const labelY = pad.top + plotH + 10;
          if (chartMode === "weekly") {
            const parts = String(d.label || "").split("-");
            ctx.fillText(parts[0] || "", labelX, labelY);
            ctx.fillText(parts[1] ? `-${parts[1]}` : "", labelX, labelY + 13);
          } else {
            ctx.fillText(d.label, labelX, labelY);
          }
          ctx.restore();
        }
      });
    }

    function getThemeColors() {
      const styles = getComputedStyle(document.documentElement);
      const getVar = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
      return {
        primary: getVar("--primary", "#007aff"),
        primarySoft: getVar("--primary-soft", "rgba(0,122,255,.11)"),
        green: getVar("--green", "#34c759"),
        chartLine: getVar("--chart-line", "rgba(0,0,0,.06)"),
        chartLabel: getVar("--chart-label", "rgba(60,60,67,.58)"),
      };
    }

    function roundRect(ctx, x, y, w, h, r) {
      if (h <= 0) return;
      const radius = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
    }

    function handleChartClick(event) {
      const rect = els.incomeChart.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const hit = chartHitRegions.find(region => x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h);
      if (!hit) return;
      selectedChartPoint = hit.point;
      renderChart();
    }

    function renderChartDetail(point) {
      if (!els.chartDetail) return;
      if (!point) {
        els.chartDetail.textContent = "点击柱状图，查看该柱收入。";
        return;
      }
      els.chartDetail.innerHTML = `
        <strong>${escapeHTML(point.title || point.label)}</strong>
        <div class="detail-money">${money(point.value || 0)}</div>
      `;
    }


    function setDefaultQueryRange() {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      if (els.queryStart) els.queryStart.value = toDateKey(start);
      if (els.queryEnd) els.queryEnd.value = toDateKey(end);
      if (els.queryKeyword) els.queryKeyword.value = "";
    }

    function renderQuery() {
      if (!els.queryDetails) return;
      const result = getQueryResult();
      const income = sum(result.map(getIncome));
      const hours = sum(result.map(r => Number(r.hours) || 0));
      const avg = hours > 0 ? income / hours : 0;

      els.queryIncome.textContent = money(income);
      els.queryHours.textContent = `${round(hours)}h`;
      els.queryAvg.textContent = money(avg);
      els.queryCount.textContent = `${result.length}条`;

      renderQueryDetails(result);
    }

    function getQueryResult() {
      const start = els.queryStart.value;
      const end = els.queryEnd.value;
      const keyword = (els.queryKeyword?.value || "").trim().toLowerCase();
      return records
        .filter(r => {
          if (start && r.date < start) return false;
          if (end && r.date > end) return false;
          const searchText = [r.student, r.course, r.note].map(v => String(v || "").toLowerCase()).join(" ");
          if (keyword && !searchText.includes(keyword)) return false;
          return true;
        })
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));
    }

    function renderQueryDetails(result) {
      els.queryDetails.innerHTML = "";
      if (!result.length) {
        els.queryDetails.innerHTML = `<div class="empty-state">没有找到符合条件的收入记录。</div>`;
        return;
      }
      result.forEach(r => {
        const item = document.createElement("article");
        item.className = "query-record";
        item.innerHTML = `
          <div>
            <b>${escapeHTML(getRecordTitle(r))}</b>
            <span>${formatFullDate(parseLocalDate(r.date))}</span>
            <span>${round(r.hours)}小时 × ${money(r.rate)} / 小时${r.note ? ` · ${escapeHTML(r.note)}` : ""}</span>
          </div>
          <strong>${money(getIncome(r))}</strong>
        `;
        els.queryDetails.appendChild(item);
      });
    }


    function openSheet(record = null) {
      editingId = record ? record.id : null;
      els.formTitle.textContent = record ? "编辑记录" : "新增记录";
      els.deleteBtn.style.display = record ? "block" : "none";
      els.student.value = record?.student || "";
      els.course.value = record?.course || "";
      els.date.value = record?.date || selectedDate;
      els.hours.value = record?.hours ?? "";
      els.rate.value = record?.rate ?? "";
      els.note.value = record?.note || "";
      updatePreview();
      els.mask.classList.add("show");
      els.sheet.classList.add("show");
      els.sheet.setAttribute("aria-hidden", "false");
      setTimeout(() => els.student.focus(), 180);
    }

    function closeSheet() {
      els.mask.classList.remove("show");
      els.sheet.classList.remove("show");
      els.sheet.setAttribute("aria-hidden", "true");
    }

    function saveRecord() {
      const student = els.student.value.trim();
      const course = els.course.value.trim();
      const date = els.date.value;
      const hours = Number(els.hours.value);
      const rate = Number(els.rate.value);
      const note = els.note.value.trim();

      if (!isDateKey(date)) return showToast("请选择有效日期");
      if (!Number.isFinite(hours) || hours <= 0) return showToast("请输入有效小时数");
      if (!Number.isFinite(rate) || rate <= 0) return showToast("请输入有效单价");

      if (editingId) {
        records = records.map(r => r.id === editingId ? { ...r, student, course, date, hours, rate, note, updatedAt: Date.now() } : r);
        showToast("已更新");
      } else {
        records.push({
          id: createId(),
          student, course, date, hours, rate, note,
          createdAt: Date.now(), updatedAt: Date.now(),
        });
        showToast("已保存");
      }

      selectedDate = date;
      viewDate = parseLocalDate(date);
      persist();
      closeSheet();
      render();
    }

    function deleteRecord() {
      if (!editingId) return;
      if (!confirm("确定删除这条记录吗？")) return;
      records = records.filter(r => r.id !== editingId);
      persist();
      closeSheet();
      render();
      showToast("已删除");
    }

    function updatePreview() {
      const hours = Number(els.hours.value) || 0;
      const rate = Number(els.rate.value) || 0;
      els.previewIncome.textContent = money(hours * rate);
    }

    function exportBackup() {
      const payload = { app: "收入记录本", exportedAt: new Date().toISOString(), records };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `收入记录本备份-${toDateKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("已导出备份");
    }

    function importBackup(event) {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || "{}"));
          const imported = Array.isArray(parsed) ? parsed : parsed.records;
          if (!Array.isArray(imported)) throw new Error("Invalid backup");
          const normalized = imported.map(normalizeRecord).filter(Boolean);
          if (!normalized.length && imported.length) throw new Error("Invalid records");
          if (!confirm(`将导入 ${normalized.length} 条记录，并替换当前数据。确定继续吗？`)) return;
          records = normalized;
          persist();
          render();
          showToast("导入成功");
        } catch (error) {
          showToast("备份文件格式不正确");
        } finally {
          els.importFile.value = "";
        }
      };
      reader.readAsText(file, "utf-8");
    }

    function loadRecords() {
      const stableRecords = readRecordsFromStorage(STORAGE_KEY);
      if (stableRecords) return stableRecords;

      const legacyRecords = getLegacyStorageKeys()
        .map(readRecordsFromStorage)
        .filter(Boolean)
        .sort((a, b) => getLatestRecordTime(b) - getLatestRecordTime(a))[0];

      if (legacyRecords) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyRecords)); } catch (error) {}
        return legacyRecords;
      }

      return [];
    }

    function readRecordsFromStorage(key) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.map(normalizeRecord).filter(Boolean);
      } catch (error) {
        return null;
      }
    }

    function getLegacyStorageKeys() {
      try {
        return Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
          .filter(key => key && LEGACY_STORAGE_KEY_PATTERN.test(key));
      } catch (error) {
        return [];
      }
    }

    function getLatestRecordTime(items) {
      return Math.max(0, ...items.map(item => Number(item.updatedAt || item.createdAt || 0)));
    }

    function normalizeRecord(r) {
      if (!r || !isDateKey(r.date)) return null;
      const hours = Number(r.hours);
      const rate = Number(r.rate);
      if (!Number.isFinite(hours) || !Number.isFinite(rate) || hours <= 0 || rate <= 0) return null;
      return {
        id: String(r.id || createId()),
        student: String(r.student || "").trim(),
        course: String(r.course || "").trim(),
        date: String(r.date),
        hours,
        rate,
        note: String(r.note || "").trim(),
        createdAt: Number(r.createdAt || Date.now()),
        updatedAt: Number(r.updatedAt || r.createdAt || Date.now()),
      };
    }

    function persist() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
      } catch (error) {
        showToast("保存失败：浏览器存储不可用");
        return false;
      }
    }

    function createId() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function isDateKey(value) {
      const key = String(value || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
      const date = parseLocalDate(key);
      return !Number.isNaN(date.getTime()) && toDateKey(date) === key;
    }

    function getIncome(r) { return (Number(r.hours) || 0) * (Number(r.rate) || 0); }
    function sum(nums) { return nums.reduce((acc, n) => acc + (Number(n) || 0), 0); }

    function getCurrentMonthRecords() {
      const y = viewDate.getFullYear();
      const m = viewDate.getMonth();
      return records.filter(r => {
        const d = parseLocalDate(r.date);
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }

    function getIncomeByDate() {
      const map = {};
      records.forEach(r => { map[r.date] = (map[r.date] || 0) + getIncome(r); });
      return map;
    }

    function buildMonthCalendarDays(year, month) {
      const first = new Date(year, month, 1);
      const last = new Date(year, month + 1, 0);
      const mondayOffset = (first.getDay() + 6) % 7;
      const sundayOffset = 6 - ((last.getDay() + 6) % 7);
      const start = new Date(year, month, 1 - mondayOffset);
      const end = new Date(year, month, last.getDate() + sundayOffset);
      const days = [];
      let cursor = new Date(start);
      while (cursor <= end) {
        const d = new Date(cursor);
        days.push({ date: d, key: toDateKey(d), inMonth: d.getMonth() === month });
        cursor.setDate(cursor.getDate() + 1);
      }
      return days;
    }

    function getWeekStart(date) {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      return d;
    }

    function addDays(date, days) {
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      d.setDate(d.getDate() + days);
      return d;
    }

    function getRecentWeeks(count, anchorDate) {
      const currentStart = getWeekStart(anchorDate);
      return Array.from({ length: count }, (_, i) => {
        const start = addDays(currentStart, -7 * (count - 1 - i));
        return { start, end: addDays(start, 6) };
      });
    }

    function getRecordsBetween(start, end) {
      const startKey = toDateKey(start);
      const endKey = toDateKey(end);
      return records.filter(r => r.date >= startKey && r.date <= endKey);
    }

    function formatShortDate(date) {
      return `${date.getMonth() + 1}.${date.getDate()}`;
    }

    function formatWeekRange(start, end) {
      return `${formatShortDate(start)}-${formatShortDate(end)}`;
    }

    function formatWeekShortLabel(start, end) {
      return `${formatShortDate(start)}-${formatShortDate(end)}`;
    }

    function getWeekRangeLabel(start) {
      return `${formatWeekRange(start, addDays(start, 6))} · 周一至周日`;
    }

    function getRecordTitle(r) {
      const parts = [r.student, r.course].map(v => String(v || "").trim()).filter(Boolean);
      return parts.join(" · ") || "未命名课程";
    }

    function money(n) {
      const value = Number(n) || 0;
      if (Math.abs(value) >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
      return `¥${Math.round(value).toLocaleString("zh-CN")}`;
    }

    function round(n) {
      const value = Number(n) || 0;
      return Number.isInteger(value) ? value : Number(value.toFixed(1));
    }

    function toDateKey(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }

    function parseLocalDate(dateKey) {
      const [y, m, d] = String(dateKey).split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    function formatFullDate(date) {
      const week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${week}`;
    }

    function formatSelectedTitle(dateKey) {
      const d = parseLocalDate(dateKey);
      const today = toDateKey(new Date());
      if (dateKey === today) return "今日记录";
      return `${d.getMonth() + 1}月${d.getDate()}日记录`;
    }

    function escapeHTML(str) {
      return String(str).replace(/[&<>'"]/g, tag => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
      }[tag]));
    }

    function startDateWatcher() {
      setInterval(() => {
        const nowKey = toDateKey(new Date());
        if (nowKey !== currentDayKey) {
          currentDayKey = nowKey;
          els.todayText.textContent = formatFullDate(new Date());
          renderSummary();
          renderCalendar();
          renderWeekList();
          if (currentPage === "stats") renderChart();
        }
      }, 60 * 1000);
    }

    let toastTimer = null;
    function showToast(text) {
      els.toast.textContent = text;
      els.toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1650);
    }
