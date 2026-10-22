(() => {
  "use strict";

  const TZ = "Asia/Ho_Chi_Minh";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel) => document.querySelector(sel);

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node[key] = value;
    }
    for (const child of [].concat(children)) node.append(child);
    return node;
  }

  async function api(path, options = {}) {
    const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
    let data = null;
    try { data = await res.json(); } catch { /* không có nội dung */ }
    if (!res.ok) throw new Error(data?.error || "Có lỗi xảy ra. Vui lòng thử lại.");
    return data;
  }

  function vnTimeParts() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const get = (type) => Number(parts.find((p) => p.type === type).value) % 24 || 0;
    return { h: get("hour"), m: get("minute"), s: get("second") };
  }

  /* ---------------- Đồng hồ số (chữ) ---------------- */
  function initClockText() {
    const digital = $("#clock-digital");
    const dateEl = $("#clock-date");
    const pad = (n) => String(n).padStart(2, "0");

    const tick = () => {
      const { h, m, s } = vnTimeParts();
      digital.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    };
    const renderDate = () => {
      dateEl.textContent = new Date().toLocaleDateString("vi-VN", {
        timeZone: TZ, weekday: "long", day: "numeric", month: "numeric", year: "numeric",
      });
    };

    tick();
    renderDate();
    setInterval(tick, 1000);
    setInterval(renderDate, 60000);
  }

  /* ---------------- Nhập thông tin + Cổng Thông tin dùng chung ---------------- */
  function initEntries() {
    const body = $("#portal-body");
    const empty = $("#portal-empty");
    const status = $("#entry-status");
    const btnAdd = $("#btn-add");
    const fLoai = $("#f-loai");
    const fMoTa = $("#f-mota");
    const fNoiDung = $("#f-noidung");
    let entries = [];

    const setStatus = (text, isError = false) => {
      status.textContent = text;
      status.classList.toggle("error", isError);
    };

    const formatTime = (value) => {
      const d = new Date(String(value).replace(" ", "T") + "Z");
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleString("vi-VN", { timeZone: TZ, hour12: false });
    };

    function render() {
      body.replaceChildren(
        ...entries.map((e, i) =>
          el("tr", {}, [
            el("td", { class: "num", text: String(i + 1) }),
            el("td", { text: e.mo_ta }),
            el("td", { text: e.loai_thong_tin }),
            el("td", { class: "content", text: e.noi_dung || "" }),
            el("td", { class: "time", text: formatTime(e.created_at) }),
          ])
        )
      );
      empty.hidden = entries.length > 0;
    }

    async function load() {
      try {
        entries = await api("/api/entries");
        render();
      } catch (err) {
        entries = [];
        render();
        empty.hidden = false;
        empty.textContent = err.message;
      }
    }

    async function add() {
      const payload = {
        loai_thong_tin: fLoai.value.trim(),
        mo_ta: fMoTa.value.trim(),
        noi_dung: fNoiDung.value.trim(),
      };
      if (!payload.loai_thong_tin || !payload.mo_ta) {
        setStatus("Cần nhập Loại thông tin và Mô tả.", true);
        return;
      }
      btnAdd.disabled = true;
      setStatus("Đang lưu…");
      try {
        const row = await api("/api/entries", { method: "POST", body: JSON.stringify(payload) });
        entries.unshift(row);
        render();
        fLoai.value = fMoTa.value = fNoiDung.value = "";
        setStatus("Đã thêm thông tin.");
        const firstRow = body.firstElementChild;
        if (firstRow && window.gsap && !reduceMotion) {
          gsap.from(firstRow, { backgroundColor: "rgba(242,184,75,0.35)", duration: 1.4, ease: "power2.out", clearProps: "backgroundColor" });
        }
        fLoai.focus();
      } catch (err) {
        setStatus(err.message, true);
      } finally {
        btnAdd.disabled = false;
      }
    }

    btnAdd.addEventListener("click", add);
    $("#btn-refresh").addEventListener("click", load);
    load();
  }

  /* ---------------- Ghi chú trong tuần ---------------- */
  function initNotes() {
    const days = [
      ["mon", "Thứ 2"], ["tue", "Thứ 3"], ["wed", "Thứ 4"], ["thu", "Thứ 5"],
      ["fri", "Thứ 6"], ["sat", "Thứ 7"], ["sun", "Chủ nhật"],
    ];
    const todayKey = new Date()
      .toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" })
      .toLowerCase()
      .slice(0, 3);

    const list = $("#notes-list");
    const inputs = {};
    const dirty = new Set();

    for (const [key, label] of days) {
      const input = el("input", { type: "text", maxLength: 5000, placeholder: "Nội dung…", autocomplete: "off" });
      input.setAttribute("aria-label", `Ghi chú ${label}`);
      const btn = el("button", { class: "btn-save", type: "button", text: "Lưu" });
      inputs[key] = input;

      input.addEventListener("input", () => dirty.add(key));

      const save = async () => {
        btn.disabled = true;
        try {
          await api(`/api/notes/${key}`, { method: "PUT", body: JSON.stringify({ text: input.value }) });
          dirty.delete(key);
          btn.textContent = "Đã lưu";
          btn.classList.add("done");
        } catch (err) {
          btn.textContent = "Lỗi";
          btn.title = err.message;
        } finally {
          btn.disabled = false;
          setTimeout(() => {
            btn.textContent = "Lưu";
            btn.classList.remove("done");
            btn.title = "";
          }, 1800);
        }
      };
      btn.addEventListener("click", save);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });

      list.append(
        el("div", { class: "note" + (key === todayKey ? " today" : "") }, [
          el("span", { class: "day", text: label }), input, btn,
        ])
      );
    }

    api("/api/notes")
      .then((data) => {
        for (const [key] of days) {
          if (!dirty.has(key)) inputs[key].value = data[key] || "";
        }
      })
      .catch(() => { /* ô vẫn nhập được khi chưa tải xong */ });
  }

  /* ---------------- Khung tranh ảnh ---------------- */
  function initFrames() {
    const list = $("#frames-list");

    function buildFrame(frame, index) {
      const art = el("div", { class: "frame-art" });
      const caption = el("p", { class: "frame-caption" });

      const show = (data) => {
        caption.textContent = data.caption || "";
        if (data.url) {
          const img = el("img", { src: data.url, alt: data.caption || `Ảnh ${index + 1}`, loading: "lazy" });
          img.addEventListener("error", () => art.replaceChildren(el("div", { class: "placeholder", text: "Không tải được ảnh. Kiểm tra lại địa chỉ." })));
          art.replaceChildren(img);
        } else {
          art.replaceChildren(el("div", { class: "placeholder", text: "Khung trống. Mở “Đổi ảnh” để thêm ảnh." }));
        }
      };
      show(frame);

      const urlInput = el("input", { type: "url", placeholder: "Địa chỉ ảnh (https://…)", value: frame.url || "" });
      const capInput = el("input", { type: "text", placeholder: "Chú thích", maxLength: 120, value: frame.caption || "" });
      const msg = el("span", { class: "status" });
      const save = el("button", { class: "btn-ghost", type: "button", text: "Lưu ảnh" });

      save.addEventListener("click", async () => {
        save.disabled = true;
        msg.classList.remove("error");
        msg.textContent = "Đang lưu…";
        try {
          const data = await api(`/api/frames/${index}`, {
            method: "PUT",
            body: JSON.stringify({ url: urlInput.value, caption: capInput.value }),
          });
          show(data);
          msg.textContent = "Đã lưu.";
          if (window.gsap && !reduceMotion) gsap.from(art, { scale: 0.96, duration: 0.5, ease: "back.out(2)" });
        } catch (err) {
          msg.classList.add("error");
          msg.textContent = err.message;
        } finally {
          save.disabled = false;
        }
      });

      return el("div", { class: "frame" }, [
        art, caption,
        el("details", {}, [
          el("summary", { text: "Đổi ảnh" }),
          el("div", { class: "frame-edit" }, [urlInput, capInput, el("div", { class: "form-actions" }, [save, msg])]),
        ]),
      ]);
    }

    api("/api/frames")
      .then((frames) => list.replaceChildren(...frames.map(buildFrame)))
      .catch((err) => list.replaceChildren(el("p", { class: "empty", text: err.message })));
  }

  window.WS = { TZ, reduceMotion, vnTimeParts };
  initClockText();
  initEntries();
  initNotes();
  initFrames();
})();
