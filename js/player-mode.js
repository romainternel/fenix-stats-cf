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

            // Afficher la barre mode joueur
            const bar = document.getElementById('pm-bar');
            if (bar) {
                bar.style.display = 'flex';
                const nameEl = document.getElementById('pm-player-name');
                if (nameEl) nameEl.textContent = PLAYER_SESSION.nom;
            }

            // Cacher les pages staff, montrer la page joueurs
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const pj = document.getElementById('page-joueurs');
            if (pj) { pj.classList.add('active'); pj.style.paddingTop = '0'; }

            // Cacher le terrain (non pertinent en mode joueur)
            const terrain = document.querySelector('.joueur-terrain-section');
            if (terrain) terrain.style.display = 'none';

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

            const ficheArea = document.getElementById('page-joueurs');
            const matchArea = document.getElementById('pm-match-page');

            if (tab === 'fiche') {
                if (matchArea) matchArea.style.display = 'none';
                if (ficheArea) ficheArea.style.display = 'block';
                // Forcer la sélection du joueur
                if (typeof DATA !== 'undefined' && DATA.length > 0) {
                    const nom = getSessionPlayerNom();
                    if (nom) {
                        // Cacher la grille terrain, montrer directement la fiche
                        const terrain = document.querySelector('.joueur-terrain-section');
                        if (terrain) terrain.style.display = 'none';
                        if (typeof selectJoueur === 'function') selectJoueur(nom);
                    }
                }
            } else {
                if (ficheArea) ficheArea.style.display = 'none';
                if (matchArea) matchArea.style.display = 'block';
                renderPlayerMatchStats();
            }
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
            // Pré-remplir select avec les joueurs TERRAIN
            const nomSel = document.getElementById('pa-nom-sel');
            if (nomSel && typeof JOUEURS_TERRAIN !== 'undefined') {
                const existing = Object.keys(accounts);
                const opts = JOUEURS_TERRAIN
                    .filter(p => !existing.includes(p.nom))
                    .map(p => `<option value="${p.nom}">${p.nom} (${p.poste})</option>`)
                    .join('');
                nomSel.innerHTML = '<option value="">-- Choisir un joueur --</option>' + opts;
            }
            // Lister les comptes existants
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
                    if (isPlayerMode()) {
                        setupPlayerUI();
                    }
                } catch (e) {}
            }
        });
