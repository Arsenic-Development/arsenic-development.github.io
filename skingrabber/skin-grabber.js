document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("skin-form");
  const input = document.getElementById("skin-username");
  const statusEl = document.getElementById("skin-status");
  const resultsEl = document.getElementById("skin-results");
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!form || !input || !statusEl || !resultsEl || !submitBtn) return;

  const mojangProfileBase =
    "https://api.mojang.com/users/profiles/minecraft/";
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

  function parseJsonSafe(text) {
    if (!text || !text.trim()) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * @returns {Promise<{ id: string, name: string } | { notFound: true } | null>}
   */
  async function resolveJavaProfile(username) {
    try {
      const res = await fetch(mojangProfileBase + encodeURIComponent(username));
      const text = await res.text();

      if (res.status === 404 || res.status === 204) {
        return { notFound: true };
      }

      if (res.ok) {
        const data = parseJsonSafe(text);
        if (data?.id && data?.name) {
          return { id: String(data.id).replace(/-/g, ""), name: data.name };
        }
      }

      if (res.status === 400) {
        return { notFound: true };
      }
    } catch {
      /* fall through to Ashcon */
    }

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
    if (!raw) {
      setStatus("Enter a Minecraft username.", true);
      clearResults();
      return;
    }

    if (!USERNAME_RE.test(raw)) {
      setStatus(
        "Use 3–16 characters: letters, numbers, and underscores only (Java usernames; case is ignored).",
        true,
      );
      clearResults();
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
        setStatus(
          "Could not reach profile services. If you opened this file from disk, use a local web server (e.g. Live Server) or deploy the site — browsers block some API calls from file://.",
          true,
        );
        return;
      }

      const { id, name } = profile;
      const dashed = uuidWithDashes(id);
      const skinUrl = `https://crafatar.com/skins/${dashed}`;
      const renderUrl = `https://crafatar.com/renders/body/${dashed}?scale=4&overlay`;
      const avatarUrl = `https://crafatar.com/avatars/${dashed}?size=128&overlay`;

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
      addCopyField(cmds, "Avatar URL (plugins, sites, Discord bots)", avatarUrl);

      const dlRow = document.createElement("div");
      dlRow.className = "tool-dl-row";

      const aSkin = document.createElement("a");
      aSkin.href = skinUrl;
      aSkin.className = "tool-dl";
      aSkin.target = "_blank";
      aSkin.rel = "noopener noreferrer";
      aSkin.innerHTML =
        '<i class="bi bi-download" aria-hidden="true"></i> Download skin PNG';

      const aAvatar = document.createElement("a");
      aAvatar.href = avatarUrl;
      aAvatar.className = "tool-dl";
      aAvatar.target = "_blank";
      aAvatar.rel = "noopener noreferrer";
      aAvatar.innerHTML =
        '<i class="bi bi-link-45deg" aria-hidden="true"></i> Open avatar';

      dlRow.append(aSkin, aAvatar);
      meta.append(dlRow, cmds);

      const skinWrap = document.createElement("div");
      skinWrap.className = "tool-skin-wrap";
      const img = document.createElement("img");
      img.src = renderUrl;
      img.alt = `Skin preview for ${name}`;
      img.className = "tool-skin-img";
      img.width = 120;
      img.height = 240;
      img.loading = "lazy";
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
