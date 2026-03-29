document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("skin-form");
  const input = document.getElementById("skin-username");
  const statusEl = document.getElementById("skin-status");
  const validationEl = document.getElementById("skin-validation");
  const resultsEl = document.getElementById("skin-results");
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!form || !input || !statusEl || !resultsEl || !submitBtn) return;

  resultsEl.addEventListener(
    "selectstart",
    (e) => {
      if (e.target.closest?.(".tool-copy-row code")) {
        e.preventDefault();
      }
    },
    true,
  );

  const mojangProfileBase = "https://api.mojang.com/users/profiles/minecraft/";
  const USERNAME_RE = /^[a-z0-9_]{3,16}$/;

  function uuidWithDashes(id) {
    if (!id || id.length !== 32) return id;
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.classList.toggle("tool-status--error", isError);
  }

  function clearResults() {
    resultsEl.classList.remove("is-visible");
    resultsEl.replaceChildren();
  }

  function showValidationError(message) {
    if (validationEl) {
      validationEl.textContent = message;
      validationEl.hidden = false;
    }
    input.classList.add("tool-input--invalid");
  }

  function clearValidationError() {
    if (validationEl) {
      validationEl.hidden = true;
      validationEl.textContent = "";
    }
    input.classList.remove("tool-input--invalid");
  }

  input.addEventListener("input", () => {
    clearValidationError();
  });

  function parseJsonSafe(text) {
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  const DEFAULT_OVERLAY_REGIONS = [
    "Head overlay (hat / helmet)",
    "Torso / jacket overlay",
    "Right sleeve overlay",
    "Left sleeve overlay",
    "Right pant leg overlay",
    "Left pant leg overlay",
  ];

  function parseSkinLayersFromPlayer(player) {
    if (!player?.properties) {
      return null;
    }
    const prop = player.properties.find((p) => p.name === "textures");
    if (!prop?.value) {
      return null;
    }
    let decoded;
    try {
      decoded = JSON.parse(atob(prop.value));
    } catch {
      return null;
    }
    const skin = decoded.textures?.SKIN;
    const cape = decoded.textures?.CAPE;
    const isSlim = skin?.metadata?.model === "slim";
    const model = isSlim ? "Slim (Alex)" : "Normal (Steve)";
    const modelKey = isSlim ? "slim" : "wide";
    const capeLine = cape?.url
      ? "Linked on this Mojang profile"
      : "None on this profile";
    return {
      model,
      modelKey,
      capeLine,
      overlayRegions: DEFAULT_OVERLAY_REGIONS,
      skinTextureUrl: player.skin_texture || skin?.url || null,
    };
  }

  async function fetchPlayerdbPlayer(username) {
    try {
      const res = await fetch(
        `https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`,
      );
      const data = parseJsonSafe(await res.text());
      if (!data?.success || !data.data?.player) {
        return null;
      }
      return data.data.player;
    } catch {
      return null;
    }
  }

  function layoutHintFromDimensions(w, h) {
    if (!w || !h) {
      return null;
    }
    if (w === 64 && h === 64) {
      return "64×64 — full geometry + second-layer map";
    }
    if (w === 64 && h === 32) {
      return "64×32 — classic file (no outer layer map)";
    }
    if (w === 128 && h === 128) {
      return "128×128 — high-res template";
    }
    return `${w}×${h}`;
  }

  function probeSkinTextureMeta(url) {
    if (!url) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () =>
        resolve(layoutHintFromDimensions(img.naturalWidth, img.naturalHeight));
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function downloadSkinPng(urlCandidates, filename) {
    const tried = [...urlCandidates];
    for (const url of tried) {
      if (!url) {
        continue;
      }
      try {
        const res = await fetch(url, { mode: "cors", cache: "no-store" });
        if (!res.ok) {
          continue;
        }
        const blob = await res.blob();
        if (!blob || blob.size < 32) {
          continue;
        }
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = filename;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objUrl);
        return true;
      } catch {
        /* try next URL */
      }
    }
    return false;
  }

  async function fetchMojangProfile(username) {
    try {
      const res = await fetch(mojangProfileBase + encodeURIComponent(username));
      const text = await res.text();

      if (res.status === 404 || res.status === 204 || res.status === 400) {
        return { notFound: true };
      }

      if (res.ok) {
        const data = parseJsonSafe(text);
        if (data?.id && data?.name) {
          return {
            id: String(data.id).replace(/-/g, ""),
            name: data.name,
          };
        }
      }
    } catch {
      /* CORS, offline, file://, etc. */
    }
    return null;
  }

  async function fetchPlayerdbProfile(username) {
    try {
      const res = await fetch(
        `https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`,
      );
      const text = await res.text();
      const data = parseJsonSafe(text);

      if (!data) {
        if (res.status === 404 || res.status === 400) {
          return { notFound: true };
        }
        return null;
      }

      if (data.success === false) {
        const code = String(data.code || "").toLowerCase();
        if (
          code.includes("not_found") ||
          code.includes("not found") ||
          code === "player.not_found"
        ) {
          return { notFound: true };
        }
        return null;
      }

      const p = data.data?.player;
      const raw =
        (p?.raw_id && String(p.raw_id).replace(/-/g, "")) ||
        (p?.id && String(p.id).replace(/-/g, ""));
      const name = p?.username;
      if (raw && raw.length === 32 && name) {
        return { id: raw, name };
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  async function fetchAshconProfile(username) {
    try {
      const res = await fetch(
        `https://api.ashcon.app/mojang/user/${encodeURIComponent(username)}`,
      );
      const text = await res.text();

      if (res.status === 404) {
        return { notFound: true };
      }

      if (!res.ok) {
        return null;
      }

      const data = parseJsonSafe(text);
      const rawUuid = data?.uuid;
      const name = data?.username ?? data?.name;
      if (!rawUuid || !name) {
        return null;
      }

      const id = String(rawUuid).replace(/-/g, "");
      if (id.length !== 32) {
        return null;
      }

      return { id, name };
    } catch {
      return null;
    }
  }

  /**
   * @returns {Promise<{ id: string, name: string } | { notFound: true } | null>}
   */
  async function resolveJavaProfile(username) {
    const mojang = await fetchMojangProfile(username);
    if (mojang?.notFound) {
      return { notFound: true };
    }
    if (mojang?.id && mojang?.name) {
      return mojang;
    }

    const playerdb = await fetchPlayerdbProfile(username);
    if (playerdb?.notFound) {
      return { notFound: true };
    }
    if (playerdb?.id && playerdb?.name) {
      return playerdb;
    }

    const ashcon = await fetchAshconProfile(username);
    if (ashcon?.notFound) {
      return { notFound: true };
    }
    if (ashcon?.id && ashcon?.name) {
      return ashcon;
    }

    return null;
  }

  async function copyText(text, button) {
    const prev = button.textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = prev;
      }, 1600);
    } catch {
      button.textContent = "Error";
      setTimeout(() => {
        button.textContent = prev;
      }, 1600);
    }
  }

  function addCopyField(container, labelText, value) {
    const wrap = document.createElement("div");
    wrap.className = "tool-field";

    const label = document.createElement("label");
    label.textContent = labelText;

    const row = document.createElement("div");
    row.className = "tool-copy-row";

    const code = document.createElement("code");
    code.textContent = value;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", () => copyText(value, btn));

    row.append(code, btn);
    wrap.append(label, row);
    container.append(wrap);
  }

  async function fetchNameHistory(uuidCompact) {
    try {
      const res = await fetch(
        `https://api.mojang.com/user/profiles/${encodeURIComponent(uuidCompact)}/names`,
      );
      if (!res.ok) return null;
      const text = await res.text();
      const data = parseJsonSafe(text);
      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = input.value.trim().toLowerCase();
    clearValidationError();

    if (!raw) {
      showValidationError(
        "Type a Minecraft username first — 3 to 16 letters, numbers, or underscores.",
      );
      setStatus("");
      clearResults();
      input.focus();
      return;
    }

    if (!USERNAME_RE.test(raw)) {
      showValidationError(
        "That username format isn’t valid. Use 3–16 characters: a–z, 0–9, or _ only.",
      );
      setStatus("");
      clearResults();
      input.focus();
      return;
    }

    setStatus("Looking up profile…");
    clearResults();
    submitBtn.disabled = true;

    try {
      const profile = await resolveJavaProfile(raw);

      if (profile?.notFound) {
        setStatus("Player not found. Check the username and try again.", true);
        return;
      }

      if (!profile) {
        const fileHint =
          window.location.protocol === "file:"
            ? " If you opened this page as a local file, also try Live Server or any http:// host."
            : "";
        setStatus(
          `Could not reach any profile API (offline, firewall, or temporary outage).${fileHint}`,
          true,
        );
        return;
      }

      const { id, name } = profile;
      const dashed = uuidWithDashes(id);
      const skinUrl = `https://mc-heads.net/skin/${dashed}`;
      const renderUrl = `https://mc-heads.net/body/${dashed}/128`;
      const avatarUrl = `https://mc-heads.net/avatar/${dashed}/128`;

      const playerdbPlayer = await fetchPlayerdbPlayer(raw);
      const layerMeta = playerdbPlayer
        ? parseSkinLayersFromPlayer(playerdbPlayer)
        : null;

      const history = await fetchNameHistory(id);
      const headCmd = `/give @p minecraft:player_head{SkullOwner:"${name}"} 1`;

      setStatus("Profile loaded.");

      const grid = document.createElement("div");
      grid.className = "tool-results-grid";

      const meta = document.createElement("div");
      meta.className = "tool-meta-block";

      const h2 = document.createElement("h2");
      h2.textContent = "Account data";
      meta.append(h2);

      addCopyField(meta, "Current name", name);
      addCopyField(meta, "UUID (with dashes)", dashed);
      addCopyField(meta, "UUID (no dashes)", id);

      if (history && history.length > 0) {
        const names = history
          .map((entry) =>
            typeof entry === "string" ? entry : entry.name || "",
          )
          .filter(Boolean);
        if (names.length > 0) {
          const uniq = [...new Set(names)].join(", ");
          const histLabel = document.createElement("div");
          histLabel.className = "tool-field";
          const lbl = document.createElement("label");
          lbl.textContent = "Known names (if available)";
          const p = document.createElement("p");
          p.className = "tool-page-lede";
          p.style.margin = "0";
          p.style.fontSize = "0.88rem";
          p.textContent = uniq;
          histLabel.append(lbl, p);
          meta.append(histLabel);
        }
      }

      function craftheadPreviewUrl(uuidDashed, mode) {
        return mode === "slim"
          ? `https://crafthead.net/body/${uuidDashed}/alex`
          : `https://crafthead.net/body/${uuidDashed}`;
      }

      const dlRow = document.createElement("div");
      dlRow.className = "tool-dl-row";

      const downloadUrls = [
        skinUrl,
        `https://api.mineatar.io/skin/${dashed}`,
        layerMeta?.skinTextureUrl,
        `https://minotar.net/skin/${encodeURIComponent(name)}`,
      ].filter(Boolean);

      const btnDownload = document.createElement("button");
      btnDownload.type = "button";
      btnDownload.className = "tool-dl tool-dl--download";
      btnDownload.innerHTML =
        '<i class="bi bi-download" aria-hidden="true"></i> Download skin PNG';
      btnDownload.addEventListener("click", async () => {
        btnDownload.disabled = true;
        const ok = await downloadSkinPng(
          downloadUrls,
          `${name.replace(/[^\w-]/g, "_")}-skin.png`,
        );
        btnDownload.disabled = false;
        if (!ok) {
          setStatus(
            "Could not download the PNG automatically (browser blocked the file). Open the avatar link or copy the URL instead.",
            true,
          );
        }
      });

      const aAvatar = document.createElement("a");
      aAvatar.href = avatarUrl;
      aAvatar.className = "tool-dl";
      aAvatar.target = "_blank";
      aAvatar.rel = "noopener noreferrer";
      aAvatar.innerHTML =
        '<i class="bi bi-link-45deg" aria-hidden="true"></i> Open avatar';

      dlRow.append(btnDownload, aAvatar);

      const cmds = document.createElement("div");
      cmds.className = "tool-commands";
      const h3 = document.createElement("h3");
      h3.textContent = "Server / setup hints";
      const hint = document.createElement("p");
      hint.className = "tool-page-lede";
      hint.style.margin = "0 0 0.75rem";
      hint.style.fontSize = "0.84rem";
      hint.textContent =
        "Use the UUID or skin URL in LuckPerms, skinsrestorer, auth plugins, bots, or custom resources. Adjust /give syntax for your Minecraft version.";
      cmds.append(h3, hint);
      addCopyField(
        cmds,
        "Example /give player head (older NBT style)",
        headCmd,
      );
      addCopyField(
        cmds,
        "Avatar URL (plugins, sites, Discord bots)",
        avatarUrl,
      );

      const hintsSplit = document.createElement("div");
      hintsSplit.className = "tool-hints-split";
      hintsSplit.append(cmds);

      meta.append(dlRow, hintsSplit);

      const skinWrap = document.createElement("div");
      skinWrap.className = "tool-skin-wrap";
      const img = document.createElement("img");
      img.alt = `Skin preview for ${name}`;
      img.className = "tool-skin-img";
      img.width = 120;
      img.height = 240;
      img.loading = "lazy";

      function buildPreviewFallbacks(mode) {
        const wide = [
          craftheadPreviewUrl(dashed, "wide"),
          renderUrl,
          `https://mc-heads.net/body/${dashed}/128`,
          `https://visage.surgeplay.com/bust/128/${dashed}`,
        ];
        const slim = [
          craftheadPreviewUrl(dashed, "slim"),
          craftheadPreviewUrl(dashed, "wide"),
          renderUrl,
          `https://mc-heads.net/body/${dashed}/128`,
        ];
        return mode === "slim" ? slim : wide;
      }

      const previewMode = layerMeta?.modelKey ?? "wide";
      let previewFi = 0;
      let previewChain = buildPreviewFallbacks(previewMode);

      img.addEventListener("error", () => {
        previewFi += 1;
        if (previewFi < previewChain.length) {
          img.src = previewChain[previewFi];
        }
      });
      img.src = previewChain[0];

      skinWrap.append(img);

      grid.append(meta, skinWrap);
      resultsEl.append(grid);
      resultsEl.classList.add("is-visible");
    } catch {
      setStatus(
        "Something went wrong while loading the profile. Try again.",
        true,
      );
    } finally {
      submitBtn.disabled = false;
    }
  });
});
