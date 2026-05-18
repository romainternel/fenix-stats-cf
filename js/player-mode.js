        // ── Session ─────────────────────────────────────────────────────────────
        let PLAYER_SESSION = null;

        function isPlayerMode() {
            return PLAYER_SESSION && PLAYER_SESSION.role === 'joueur';
        }

        function getSessionPlayerNom() {
            return PLAYER_SESSION ? PLAYER_SESSION.nom : null;
        }

        function playerLogout() {
            PLAYER_SESSION = null;
            sessionStorage.removeItem('fenix_session');
            sessionStorage.removeItem('fenix_auth');
            location.reload();
        }

        // ── Setup UI joueur ──────────────────────────────────────────────────────
        function setupPlayerUI() {
            document.body.classList.add('player-mode');

            // Masquer header + nav staff
            const staffHeader = document.querySelector('.header');
            if (staffHeader) staffHeader.style.display = 'none';
            const staffNav = document.querySelector('.nav');
            if (staffNav) staffNav.style.display = 'none';

            // Masquer le bouton "Comptes joueurs" (staff only)
            const accountsBtn = document.getElementById('btn-player-accounts');
            if (accountsBtn) accountsBtn.style.display = 'none';

            // Masquer toutes les pages staff
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

            // Afficher la barre mode joueur
            const bar = document.getElementById('pm-bar');
            if (bar) {
                bar.style.display = 'flex';
                const nameEl = document.getElementById('pm-player-name');
                if (nameEl) nameEl.textContent = PLAYER_SESSION.nom;
            }

            // Lancer le rendu fiche si données disponibles
            if (typeof DATA !== 'undefined' && DATA.length > 0) {
                pmTab('fiche');
            }
        }

        // ── Navigation tabs joueur ───────────────────────────────────────────────
        let _pmActiveTab = 'fiche';

        function pmTab(tab) {
            _pmActiveTab = tab;
            document.querySelectorAll('.pm-tab-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.tab === tab);
            });

            const ficheEl = document.getElementById('pm-fiche-page');
            const matchEl = document.getElementById('pm-match-page');

            if (tab === 'fiche') {
                if (matchEl) matchEl.style.display = 'none';
                if (ficheEl) ficheEl.style.display = 'block';
                if (typeof DATA !== 'undefined' && DATA.length > 0) renderPlayerFiche();
            } else {
                if (ficheEl) ficheEl.style.display = 'none';
                if (matchEl) matchEl.style.display = 'block';
                renderPlayerMatchStats();
            }
        }

        // ── Fiche joueur — 3 encarts ─────────────────────────────────────────────
        function renderPlayerFiche() {
            const nom = getSessionPlayerNom();
            if (!nom || !DATA.length) return;

            const terrainPlayer = (typeof JOUEURS_TERRAIN !== 'undefined')
                ? JOUEURS_TERRAIN.find(p => p.nom === nom) : null;
            const posteCode = terrainPlayer ? terrainPlayer.poste : '';
            const isGB = posteCode === 'GB';
            const posteName = {
                GB: 'Gardien de But', AG: 'Ailier Gauche', AD: 'Ailier Droit',
                ARG: 'Arrière Gauche', ARD: 'Arrière Droit', DC: 'Demi-Centre', PIV: 'Pivot'
            };
            const posteLabel = posteName[posteCode] || posteCode;
            const initials = nom.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
            const color = (typeof POSTE_COLORS !== 'undefined' && POSTE_COLORS[posteCode]) ? POSTE_COLORS[posteCode] : '#0A2463';

            // ── Temps de jeu ──
            const tjNom = (typeof getTJData === 'function') ? getTJData(nom, MATCHS) : { matchs: 0, total: 0 };
            const tjStr = tjNom.matchs
                ? `<span class="pmf-meta-item">⏱ ${tjNom.matchs} match${tjNom.matchs > 1 ? 's' : ''}</span><span class="pmf-meta-item">⌀ ${Math.round(tjNom.total / tjNom.matchs)} min/match</span>`
                : '';

            // ── Calcul stats offensifs ──
            const fenixRows = DATA.filter(r =>
                r[COLS.club] === 'FENIX' &&
                matchPlayerName((r[COLS.joueur] || '').toString().trim(), nom)
            );
            const buts  = fenixRows.filter(r => r[COLS.resultat] === 'But').length;
            const tirs  = fenixRows.filter(r => r[COLS.resultat] === 'Tir raté').length;
            const pb    = fenixRows.filter(r => r[COLS.resultat] === 'PB').length;
            const po    = fenixRows.filter(r => r[COLS.resultat] === 'PO').length;
            const total = buts + tirs;
            const eff   = total > 0 ? Math.round(buts / total * 100) : 0;
            const effColor = (typeof getEffColor === 'function') ? getEffColor(eff, posteCode) : '#0A2463';

            // PD
            let pd = 0;
            DATA.forEach(row => {
                (row[COLS.action_joueur] || '').toString().split(';').forEach((j, i) => {
                    if (!matchPlayerName(j.trim(), nom)) return;
                    const act = (typeof lastNonEmpty === 'function')
                        ? lastNonEmpty((row[COLS.action_att] || '').toString().split(';'), i)
                        : '';
                    if (act === 'PD' || act === 'PD DG') pd++;
                });
            });

            // Notes ATT/DEF
            let attPlus = 0, attMoins = 0, defPlus = 0, defMoins = 0;
            DATA.forEach(row => {
                const joueurs = (row[COLS.action_joueur] || '').toString().split(';');
                const atts   = (row[COLS.action_att]    || '').toString().split(';');
                const defs   = (row[COLS.action_def]    || '').toString().split(';');
                joueurs.forEach((j, idx) => {
                    if (!matchPlayerName(j.trim(), nom)) return;
                    const att = (typeof lastNonEmpty === 'function') ? lastNonEmpty(atts, idx) : '';
                    const def = (typeof lastNonEmpty === 'function') ? lastNonEmpty(defs, idx) : '';
                    if (isPositiveATT(att)) attPlus++;
                    else if (isNegativeATT(att)) attMoins++;
                    if (isPositiveDEF(def)) defPlus++;
                    else if (isNegativeDEF(def)) defMoins++;
                });
            });
            const note = (attPlus - attMoins) + (defPlus - defMoins);
            const noteColor   = note > 0 ? '#10B981' : note < 0 ? '#EF4444' : '#64748B';
            const noteDisplay = (note > 0 ? '+' : '') + note;

            // ── GB : stats arrêts ──
            let gbArrets = 0, gbButs = 0, gbEff = 0, gbEffColor = '#64748B';
            if (isGB) {
                const gbRows = DATA.filter(r =>
                    r[COLS.club] !== 'FENIX' &&
                    matchPlayerName((r[COLS.gardien] || '').toString().trim(), nom) &&
                    (r[COLS.resultat] === 'But' || r[COLS.finalite] === 'Tir arrêté')
                );
                gbArrets = gbRows.filter(r => r[COLS.finalite] === 'Tir arrêté').length;
                gbButs   = gbRows.filter(r => r[COLS.resultat]  === 'But').length;
                const gbTotal = gbArrets + gbButs;
                gbEff = gbTotal > 0 ? Math.round(gbArrets / gbTotal * 100) : 0;
                gbEffColor = (typeof getEffColor === 'function') ? getEffColor(gbEff, 'GB') : '#0A2463';
            }

            // ── Données impact pour cet encart ──
            const impactRowsAll = isGB
                ? DATA.filter(r =>
                    r[COLS.club] !== 'FENIX' &&
                    matchPlayerName((r[COLS.gardien] || '').toString().trim(), nom) &&
                    r[COLS.impact] && String(r[COLS.impact]).includes(';'))
                : DATA.filter(r =>
                    r[COLS.club] === 'FENIX' &&
                    matchPlayerName((r[COLS.joueur] || '').toString().trim(), nom) &&
                    r[COLS.impact] && String(r[COLS.impact]).includes(';'));

            // ── Zones disponibles pour ce joueur ──
            const zones = [...new Set(impactRowsAll.map(r =>
                (r[COLS.field_position] || '').toString().trim()).filter(Boolean))].sort();

            // ── Encart 1 : Stats ─────────────────────────────────────────────────
            const statsHTML = isGB ? `
                <div class="pmf-kpi-grid pmf-kpi-5">
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val">${gbArrets}/${gbArrets + gbButs}</div>
                        <div class="pmf-kpi-lbl">ARRÊTS / TIRS</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val" style="color:${gbEffColor}">${gbEff}%</div>
                        <div class="pmf-kpi-lbl">% ARRÊTS</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val" style="color:#EF4444">${gbButs}</div>
                        <div class="pmf-kpi-lbl">BUTS CONCÉDÉS</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val">${pd}</div>
                        <div class="pmf-kpi-lbl">PD</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val" style="color:${noteColor}">${noteDisplay}</div>
                        <div class="pmf-kpi-lbl">NOTE</div>
                    </div>
                </div>` : `
                <div class="pmf-kpi-grid">
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val">${buts}/${total}</div>
                        <div class="pmf-kpi-lbl">BUT / TIR</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val" style="color:${effColor}">${eff}%</div>
                        <div class="pmf-kpi-lbl">EFFICACITÉ</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val">${pd}</div>
                        <div class="pmf-kpi-lbl">PD</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val">${po}</div>
                        <div class="pmf-kpi-lbl">PÉN. OBTENUS</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val" style="color:#EF4444">${pb}</div>
                        <div class="pmf-kpi-lbl">PERTES BALLE</div>
                    </div>
                    <div class="pmf-kpi-box">
                        <div class="pmf-kpi-val" style="color:${noteColor}">${noteDisplay}</div>
                        <div class="pmf-kpi-lbl">NOTE</div>
                    </div>
                </div>`;

            // ── Encart 2 : Notes ─────────────────────────────────────────────────
            const notesHTML = `
                <div class="pmf-notes-grid">
                    <div class="pmf-note-box pmf-note-att-plus">
                        <div class="pmf-note-val">${attPlus}</div>
                        <div class="pmf-note-lbl">ATT +</div>
                    </div>
                    <div class="pmf-note-box pmf-note-att-moins">
                        <div class="pmf-note-val">${attMoins}</div>
                        <div class="pmf-note-lbl">ATT −</div>
                    </div>
                    <div class="pmf-note-box pmf-note-def-plus">
                        <div class="pmf-note-val">${defPlus}</div>
                        <div class="pmf-note-lbl">DEF +</div>
                    </div>
                    <div class="pmf-note-box pmf-note-def-moins">
                        <div class="pmf-note-val">${defMoins}</div>
                        <div class="pmf-note-lbl">DEF −</div>
                    </div>
                </div>
                <div class="pmf-note-total">
                    Note totale : <strong style="color:${noteColor};font-size:1.1rem">${noteDisplay}</strong>
                </div>`;

            // ── Encart 3 : Impact ────────────────────────────────────────────────
            const zoneOpts = '<option value="">Toutes les zones</option>'
                + zones.map(z => `<option value="${z}">${z}</option>`).join('');

            const impactLegend = isGB
                ? `<span class="pmf-legend-dot pmf-legend-green">●</span> Tir arrêté
                   <span class="pmf-legend-dot pmf-legend-red" style="margin-left:12px">✕</span> But encaissé`
                : `<span class="pmf-legend-dot pmf-legend-green">●</span> But
                   <span class="pmf-legend-dot pmf-legend-red" style="margin-left:12px">✕</span> Tir raté`;

            const impactTitle = isGB ? 'ARRÊTS ET BUTS CONCÉDÉS' : 'ZONES DE TIR';

            // ── Assemblage HTML ──────────────────────────────────────────────────
            const page = document.getElementById('pm-fiche-page');
            if (!page) return;

            page.innerHTML = `
                <!-- Header joueur -->
                <div class="pmf-header" style="background:linear-gradient(135deg,${color} 0%,${color}cc 100%)">
                    <div class="pmf-avatar">${initials}</div>
                    <div>
                        <div class="pmf-player-name">${nom}</div>
                        <div class="pmf-player-poste">${posteCode} — ${posteLabel}</div>
                        <div class="pmf-meta">${tjStr}</div>
                    </div>
                </div>

                <!-- Encart 1 : Stats -->
                <div class="pmf-card">
                    <div class="pmf-card-title">MA FICHE</div>
                    ${statsHTML}
                </div>

                <!-- Encart 2 : Notes -->
                <div class="pmf-card">
                    <div class="pmf-card-title">ACTIONS</div>
                    ${notesHTML}
                </div>

                <!-- Encart 3 : Impact -->
                <div class="pmf-card">
                    <div class="pmf-card-header-row">
                        <div class="pmf-card-title">${impactTitle}</div>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                            <span class="pmf-legend">${impactLegend}</span>
                            <select id="pmf-zone-sel" onchange="onPmfZoneChange()"
                                class="pmf-zone-sel">
                                ${zoneOpts}
                            </select>
                        </div>
                    </div>
                    <div class="pmf-canvases">
                        <div class="pmf-canvas-wrap">
                            <canvas id="pmf-canvas-alg"></canvas>
                            <div class="pmf-canvas-lbl">EXT GAUCHE</div>
                        </div>
                        <div class="pmf-canvas-wrap">
                            <canvas id="pmf-canvas-face"></canvas>
                            <div class="pmf-canvas-lbl">CENTRAL</div>
                        </div>
                        <div class="pmf-canvas-wrap">
                            <canvas id="pmf-canvas-ald"></canvas>
                            <div class="pmf-canvas-lbl">EXT DROIT</div>
                        </div>
                    </div>
                    ${impactRowsAll.length === 0
                        ? '<div class="pmf-no-impact">Aucune donnée de tir avec coordonnées</div>'
                        : ''}
                </div>`;

            // Dessiner les canvases
            _drawPmfImpact(impactRowsAll, isGB);
        }

        // ── Changement de zone impact ────────────────────────────────────────────
        function onPmfZoneChange() {
            const nom   = getSessionPlayerNom();
            const tp    = (typeof JOUEURS_TERRAIN !== 'undefined') ? JOUEURS_TERRAIN.find(p => p.nom === nom) : null;
            const isGB  = tp && tp.poste === 'GB';
            const all   = isGB
                ? DATA.filter(r =>
                    r[COLS.club] !== 'FENIX' &&
                    matchPlayerName((r[COLS.gardien] || '').toString().trim(), nom) &&
                    r[COLS.impact] && String(r[COLS.impact]).includes(';'))
                : DATA.filter(r =>
                    r[COLS.club] === 'FENIX' &&
                    matchPlayerName((r[COLS.joueur] || '').toString().trim(), nom) &&
                    r[COLS.impact] && String(r[COLS.impact]).includes(';'));
            _drawPmfImpact(all, isGB);
        }

        // ── Dessin des 3 canvases impact ─────────────────────────────────────────
        function _drawPmfImpact(allRows, isGB) {
            const zone = (document.getElementById('pmf-zone-sel') || {}).value || '';
            const rows = zone ? allRows.filter(r =>
                (r[COLS.field_position] || '').toString().trim() === zone) : allRows;

            const drawOn = (canvasId, b64, subset) => {
                const canvas = document.getElementById(canvasId);
                if (!canvas) return;
                const W = canvas.parentElement.clientWidth || 300;
                const H = Math.round(W * 0.62);
                canvas.width  = W;
                canvas.height = H;
                const ctx = canvas.getContext('2d');

                const paint = img => {
                    if (img) {
                        ctx.drawImage(img, 0, 0, W, H);
                    } else {
                        ctx.fillStyle = '#DBEAFE';
                        ctx.fillRect(0, 0, W, H);
                    }
                    subset.forEach(row => {
                        const p = String(row[COLS.impact]).split(';');
                        const x = parseFloat(p[0]), y = parseFloat(p[1]);
                        if (isNaN(x) || isNaN(y)) return;
                        const dotX = (x / 100) * W;
                        const dotY = (y / 100) * H;
                        const s = Math.max(5, W * 0.022);
                        const isPos = isGB
                            ? row[COLS.finalite] === 'Tir arrêté'
                            : row[COLS.resultat] === 'But';
                        ctx.save();
                        ctx.lineCap = 'round';
                        if (isPos) {
                            ctx.beginPath();
                            ctx.arc(dotX, dotY, s, 0, Math.PI * 2);
                            ctx.fillStyle = '#10B981';
                            ctx.fill();
                            ctx.strokeStyle = '#fff';
                            ctx.lineWidth = 1.5;
                            ctx.stroke();
                        } else {
                            const sc = s / Math.SQRT2;
                            ctx.strokeStyle = '#EF4444';
                            ctx.lineWidth = 2.5;
                            ctx.beginPath();
                            ctx.moveTo(dotX - sc, dotY - sc);
                            ctx.lineTo(dotX + sc, dotY + sc);
                            ctx.moveTo(dotX + sc, dotY - sc);
                            ctx.lineTo(dotX - sc, dotY + sc);
                            ctx.stroke();
                        }
                        ctx.restore();
                    });
                };

                if (typeof IMPACT_B64 !== 'undefined' && b64) {
                    const img = new Image();
                    img.onload  = () => paint(img);
                    img.onerror = () => paint(null);
                    img.src = b64;
                } else {
                    paint(null);
                }
            };

            const b64 = (typeof IMPACT_B64 !== 'undefined') ? IMPACT_B64 : {};
            drawOn('pmf-canvas-alg',  b64.alg,  rows.filter(r => getImpactView(r) === 'alg'));
            drawOn('pmf-canvas-face', b64.face, rows.filter(r => getImpactView(r) === 'face'));
            drawOn('pmf-canvas-ald',  b64.ald,  rows.filter(r => getImpactView(r) === 'ald'));
        }

        // ── Stats Match (mode joueur) ────────────────────────────────────────────
        function renderPlayerMatchStats() {
            const selEl = document.getElementById('pm-match-sel');
            const matchFilter = selEl ? selEl.value : '';

            const filteredData = matchFilter
                ? DATA.filter(r => r[COLS.rencontre] === matchFilter)
                : DATA;

            const uniqueMatches = [...new Set(filteredData.map(r => r[COLS.rencontre]).filter(Boolean))];
            const matchCount    = uniqueMatches.length || 1;
            const showAvg       = matchCount > 1;

            const fenix = filteredData.filter(r => r[COLS.club] === 'FENIX');
            const adv   = filteredData.filter(r => r[COLS.club] !== 'FENIX' && r[COLS.club]);

            const compute = rows => {
                const buts  = rows.filter(r => r[COLS.resultat] === 'But').length;
                const rates = rows.filter(r => r[COLS.resultat] === 'Tir raté').length;
                const total = buts + rates;
                const pen   = rows.filter(r => r[COLS.ge] && String(r[COLS.ge]).toLowerCase().includes('pen'));
                const penB  = pen.filter(r => r[COLS.resultat] === 'But').length;
                const penT  = penB + pen.filter(r => r[COLS.resultat] === 'Tir raté').length;
                const poss  = rows.filter(r => r[COLS.possession] && String(r[COLS.possession]).trim()).length;
                const pb    = rows.filter(r => r[COLS.resultat] === 'PB').length;
                const po    = rows.filter(r => r[COLS.resultat] === 'PO').length;
                const neut  = rows.filter(r => r[COLS.resultat] === 'Jet franc').length;
                const eff   = total > 0 ? Math.round(buts / total * 100) : 0;
                return { buts, rates, total, penB, penT, poss, pb, po, neut, eff };
            };

            const rd = (n, d) => Math.round(n / d);
            const fv = compute(fenix);
            const av = compute(adv);
            const advName = matchFilter
                ? ([...new Set(adv.map(r => r[COLS.club]).filter(Boolean))][0] || 'ADVERSAIRE')
                : 'ADVERSAIRE';

            const card = (data, color, title) => {
                const d = showAvg ? {
                    poss: rd(data.poss, matchCount),
                    buts: `${rd(data.buts, matchCount)}/${rd(data.total, matchCount)}`,
                    pen:  `Pen: ${rd(data.penB, matchCount)}/${rd(data.penT, matchCount)}`,
                    pb:   rd(data.pb, matchCount),
                    po:   rd(data.po, matchCount),
                    neut: rd(data.neut, matchCount),
                } : {
                    poss: data.poss,
                    buts: `${data.buts}/${data.total}`,
                    pen:  `Pen: ${data.penB}/${data.penT}`,
                    pb:   data.pb,
                    po:   data.po,
                    neut: data.neut,
                };
                return `
                <div class="pm-team-card" style="border-left:4px solid ${color}">
                    <div class="pm-team-title">
                        <span class="pm-dot" style="background:${color}"></span>
                        <strong>${title}</strong>
                        ${showAvg ? '<span class="pm-avg-lbl">(Moy./match)</span>' : ''}
                    </div>
                    <div class="pm-stats-grid">
                        <div class="pm-stat-box"><div class="pm-stat-val">${d.poss}</div><div class="pm-stat-lbl">POSSESSIONS</div></div>
                        <div class="pm-stat-box"><div class="pm-stat-val">${d.buts}</div><div class="pm-stat-lbl">BUTS<br><small style="color:#94a3b8">${d.pen}</small></div></div>
                        <div class="pm-stat-box"><div class="pm-stat-val" style="color:${color}">${data.eff}%</div><div class="pm-stat-lbl">% RÉUSSITE</div></div>
                        <div class="pm-stat-box"><div class="pm-stat-val">${d.pb}</div><div class="pm-stat-lbl">PERTES DE BALLE</div></div>
                        <div class="pm-stat-box"><div class="pm-stat-val">${d.po}</div><div class="pm-stat-lbl">PEN. OBTENUS</div></div>
                        <div class="pm-stat-box"><div class="pm-stat-val">${d.neut}</div><div class="pm-stat-lbl">NEUTRALISÉ</div></div>
                    </div>
                </div>`;
            };

            const cardsEl = document.getElementById('pm-match-cards');
            if (cardsEl) {
                cardsEl.innerHTML = card(fv, '#0A2463', 'FENIX TOULOUSE') + card(av, '#EF4444', advName);
            }
        }

        // ── Sélecteur de match (mode joueur) ────────────────────────────────────
        function buildPmMatchSelector() {
            const sel = document.getElementById('pm-match-sel');
            if (!sel) return;
            sel.innerHTML = '<option value="">Tous les matchs</option>'
                + MATCHS.map(m => `<option value="${m}">${m}</option>`).join('');
        }

        // ── Gestion comptes joueurs (staff only) ─────────────────────────────────
        function openPlayerAccountsModal() {
            const accounts = JSON.parse(localStorage.getItem('fenix_player_accounts') || '{}');
            const nomSel = document.getElementById('pa-nom-sel');
            if (nomSel && typeof JOUEURS_TERRAIN !== 'undefined') {
                const existing = Object.keys(accounts);
                const opts = JOUEURS_TERRAIN
                    .filter(p => !existing.includes(p.nom))
                    .map(p => `<option value="${p.nom}">${p.nom} (${p.poste})</option>`)
                    .join('');
                nomSel.innerHTML = '<option value="">-- Choisir un joueur --</option>' + opts;
            }
            const tbody = document.getElementById('pa-accounts-list');
            if (tbody) {
                tbody.innerHTML = Object.entries(accounts).length === 0
                    ? '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:12px">Aucun compte joueur</td></tr>'
                    : Object.entries(accounts).map(([nom, pwd]) => `
                        <tr>
                            <td style="padding:6px 10px">${nom}</td>
                            <td style="padding:6px 10px">${'•'.repeat(Math.min(pwd.length, 8))}</td>
                            <td style="padding:6px 10px;text-align:right">
                                <button onclick="deletePlayerAccount('${nom}')"
                                    style="color:#EF4444;background:none;border:none;cursor:pointer;font-size:1rem"
                                    title="Supprimer">🗑</button>
                            </td>
                        </tr>`).join('');
            }
            const modal = document.getElementById('pa-modal');
            if (modal) modal.style.display = 'flex';
        }

        function closePlayerAccountsModal() {
            const modal = document.getElementById('pa-modal');
            if (modal) modal.style.display = 'none';
        }

        function savePlayerAccount() {
            const selEl = document.getElementById('pa-nom-sel');
            const pwdEl = document.getElementById('pa-pwd');
            const nom = selEl ? selEl.value.trim() : '';
            const pwd = pwdEl ? pwdEl.value.trim() : '';
            if (!nom || !pwd) {
                alert('Sélectionne un joueur et saisis un mot de passe');
                return;
            }
            const accounts = JSON.parse(localStorage.getItem('fenix_player_accounts') || '{}');
            accounts[nom] = pwd;
            localStorage.setItem('fenix_player_accounts', JSON.stringify(accounts));
            if (pwdEl) pwdEl.value = '';
            openPlayerAccountsModal();
        }

        function deletePlayerAccount(nom) {
            if (!confirm(`Supprimer le compte de ${nom} ?`)) return;
            const accounts = JSON.parse(localStorage.getItem('fenix_player_accounts') || '{}');
            delete accounts[nom];
            localStorage.setItem('fenix_player_accounts', JSON.stringify(accounts));
            openPlayerAccountsModal();
        }

        // ── Init au chargement ───────────────────────────────────────────────────
        document.addEventListener('DOMContentLoaded', function () {
            const stored = sessionStorage.getItem('fenix_session');
            if (stored) {
                try {
                    PLAYER_SESSION = JSON.parse(stored);
                    if (isPlayerMode()) setupPlayerUI();
                } catch (e) {}
            }
        });
