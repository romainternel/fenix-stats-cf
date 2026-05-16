        function renderCourtPlayers(activeNames) {
            const g = document.getElementById('court-players');
            if (!g) return;
            g.innerHTML = '';

            // Calcul efficacité par joueur pour la bordure colorée
            const matchFilter = document.getElementById('filter-joueur-match')?.value || '';
            const playerEff = {};
            JOUEURS_TERRAIN.forEach(p => {
                if (p.poste === 'GB') {
                    // GB : % arrêts sur tirs adverses
                    const gbRows = DATA.filter(row => {
                        if (row[COLS.club] === 'FENIX') return false;
                        if (matchFilter && row[COLS.rencontre] !== matchFilter) return false;
                        const g = (row[COLS.gardien] || '').toString().trim();
                        if (!matchPlayerName(g, p.nom)) return false;
                        return row[COLS.resultat] === 'But' || row[COLS.finalite] === 'Tir arrêté';
                    });
                    const arrets     = gbRows.filter(r => r[COLS.finalite] === 'Tir arrêté').length;
                    const butsConced = gbRows.filter(r => r[COLS.resultat] === 'But').length;
                    const totalFaced = arrets + butsConced;
                    playerEff[p.nom] = totalFaced > 0 ? Math.round(arrets / totalFaced * 100) : null;
                } else {
                    const rows = DATA.filter(row => {
                        if (row[COLS.club] !== 'FENIX') return false;
                        if (matchFilter && row[COLS.rencontre] !== matchFilter) return false;
                        return matchPlayerName((row[COLS.joueur] || '').toString().trim(), p.nom);
                    });
                    const buts  = rows.filter(r => r[COLS.resultat] === 'But').length;
                    const shots = rows.filter(r => ['But', 'Tir raté'].includes(r[COLS.resultat])).length;
                    playerEff[p.nom] = shots > 0 ? Math.round(buts / shots * 100) : null;
                }
            });

            JOUEURS_TERRAIN.forEach(p => {
                const isActive   = activeNames.size === 0 || [...activeNames].some(n => matchPlayerName(n, p.nom));
                const isSelected = p.nom === currentSelectedJoueur;
                const opacity    = isActive ? 1 : 0.28;
                const r          = isSelected ? 4.5 : 3.5;

                const eff      = playerEff[p.nom];
                const ringClr  = eff !== null ? getEffColor(eff, p.poste) : '#94a3b8';
                const initials = p.nom.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
                const safeName = p.nom.replace(/'/g, "\\'");

                const elem = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                elem.setAttribute('class', 'court-player');
                elem.setAttribute('onclick', `selectJoueur('${safeName}')`);
                elem.setAttribute('opacity', opacity);

                let inner = '';
                // Cercle gris clair + bordure efficacité
                inner += `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#e2e8f0" stroke="${ringClr}" stroke-width="1.5"/>`;
                if (isSelected) {
                    inner += `<circle cx="${p.x}" cy="${p.y}" r="${r + 2}" fill="none" stroke="#FCD34D" stroke-width="1.2"/>`;
                }
                // Initiales foncées (fond clair)
                inner += `<text x="${p.x}" y="${p.y + 0.3}" text-anchor="middle" dominant-baseline="middle"
                    font-family="Inter,sans-serif" font-size="2.0" font-weight="700" fill="#0f172a">${initials}</text>`;
                elem.innerHTML = inner;
                g.appendChild(elem);
            });
        }

        function selectJoueur(nom) {
            currentSelectedJoueur = nom;
            const terrainPlayer = JOUEURS_TERRAIN.find(p => p.nom === nom);
            const color = terrainPlayer ? POSTE_COLORS[terrainPlayer.poste] : '#0A2463';
            const posteName = {
                GB: 'Gardien de But', AG: 'Ailier Gauche', AD: 'Ailier Droit',
                ARG: 'Arrière Gauche', ARD: 'Arrière Droit', DC: 'Demi-Centre', PIV: 'Pivot'
            };
            const posteCode  = terrainPlayer ? terrainPlayer.poste : '';
            const posteLabel = posteName[posteCode] || posteCode;
            const initials   = nom.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);

            // Stats globales filtrées par le filtre match actif
            const matchFilter = document.getElementById('filter-joueur-match').value;
            const rowsFiltered = DATA.filter(row => {
                if (row[COLS.club] !== 'FENIX') return false;
                if (matchFilter && row[COLS.rencontre] !== matchFilter) return false;
                return matchPlayerName((row[COLS.joueur] || '').toString().trim(), nom);
            });
            const buts  = rowsFiltered.filter(r => r[COLS.resultat] === 'But').length;
            const tirs  = rowsFiltered.filter(r => r[COLS.resultat] === 'Tir raté').length;
            const pb    = rowsFiltered.filter(r => r[COLS.resultat] === 'PB').length;
            const po    = rowsFiltered.filter(r => r[COLS.resultat] === 'PO').length;
            const total = buts + tirs;
            const eff   = total > 0 ? Math.round(buts / total * 100) : 0;

            // PD — depuis action_joueur / action_att (filtré match)
            let pd = 0;
            DATA.forEach(row => {
                if (matchFilter && row[COLS.rencontre] !== matchFilter) return;
                (row[COLS.action_joueur] || '').toString().split(';').forEach((j, i) => {
                    if (!matchPlayerName(j.trim(), nom)) return;
                    const act = lastNonEmpty((row[COLS.action_att] || '').toString().split(';'), i);
                    if (act === 'PD' || act === 'PD DG') pd++;
                });
            });

            // Note — somme actions att + def (filtré match)
            let attPlus = 0, attMoins = 0, defPlus = 0, defMoins = 0;
            DATA.forEach(row => {
                if (matchFilter && row[COLS.rencontre] !== matchFilter) return;
                const joueurs = (row[COLS.action_joueur] || '').toString().split(';');
                const atts   = (row[COLS.action_att]    || '').toString().split(';');
                const defs   = (row[COLS.action_def]    || '').toString().split(';');
                joueurs.forEach((j, idx) => {
                    if (!matchPlayerName(j.trim(), nom)) return;
                    const att = lastNonEmpty(atts, idx);
                    const def = lastNonEmpty(defs, idx);
                    if (isPositiveATT(att)) attPlus++;
                    else if (isNegativeATT(att)) attMoins++;
                    if (isPositiveDEF(def)) defPlus++;
                    else if (isNegativeDEF(def)) defMoins++;
                });
            });
            const note = (attPlus - attMoins) + (defPlus - defMoins);
            const noteColor  = note > 0 ? 'var(--fenix-success)' : note < 0 ? 'var(--fenix-danger)' : '#64748B';
            const noteDisplay = (note > 0 ? '+' : '') + note;

            // ── Carte joueur (droite du terrain) ──────────────────────────────
            const tjNom = getTJData(nom, MATCHS);
            const tjHeaderStr = tjNom.matchs
                ? `<div style="display:flex;gap:1rem;margin-top:0.35rem;font-size:0.75rem;opacity:0.9;">
                    <span>⏱ ${tjNom.matchs} matchs</span>
                    <span>⌀ ${Math.round(tjNom.total / tjNom.matchs)} min/match</span>
                  </div>`
                : '';
            const jpHeader = `
                <div class="jp-header" style="background:linear-gradient(135deg,${color} 0%,${color}cc 100%);">
                    <div class="jp-avatar">${initials}</div>
                    <div>
                        <div class="jp-name">${nom}</div>
                        <div class="jp-poste-label">${posteCode} — ${posteLabel}</div>
                        ${tjHeaderStr}
                    </div>
                </div>`;

            if (posteCode === 'GB') {
                // Stats gardien : tirs adverses sur lignes club≠FENIX, filtrées sur gardien
                const gbRows = DATA.filter(row => {
                    if (row[COLS.club] === 'FENIX') return false;
                    if (matchFilter && row[COLS.rencontre] !== matchFilter) return false;
                    const g = (row[COLS.gardien] || '').toString().trim();
                    if (!matchPlayerName(g, nom)) return false;
                    return row[COLS.resultat] === 'But' || row[COLS.finalite] === 'Tir arrêté';
                });
                const arrets     = gbRows.filter(r => r[COLS.finalite] === 'Tir arrêté').length;
                const butsConced = gbRows.filter(r => r[COLS.resultat] === 'But').length;
                const totalFaced = arrets + butsConced;
                const gbEff      = totalFaced > 0 ? Math.round(arrets / totalFaced * 100) : 0;
                const gbEffColor = totalFaced === 0 ? '#94A3B8' : getEffColor(gbEff, 'GB');

                // PD depuis action_joueur / action_att
                let gbPd = 0;
                DATA.forEach(row => {
                    if (matchFilter && row[COLS.rencontre] !== matchFilter) return;
                    (row[COLS.action_joueur] || '').toString().split(';').forEach((j, i) => {
                        if (!matchPlayerName(j.trim(), nom)) return;
                        const act = lastNonEmpty((row[COLS.action_att] || '').toString().split(';'), i);
                        if (act === 'PD' || act === 'PD DG') gbPd++;
                    });
                });

                // Buts marqués par le GB → lignes FENIX, joueur=GB
                const gbButs = DATA.filter(row =>
                    row[COLS.club] === 'FENIX' &&
                    (matchFilter ? row[COLS.rencontre] === matchFilter : true) &&
                    matchPlayerName((row[COLS.joueur] || '').toString().trim(), nom) &&
                    row[COLS.resultat] === 'But'
                ).length;

                // Note GB : utiliser le système de scoring gardien (zone-weighted)
                const gbAllNotes = calculateGardienNotes(matchFilter);
                const gbNoteEntry = Object.entries(gbAllNotes).find(([k]) => matchPlayerName(k, nom));
                const gbNoteTotal = gbNoteEntry
                    ? (gbNoteEntry[1].scoreArrets + gbNoteEntry[1].scoreButs + gbNoteEntry[1].bonus)
                    : 0;
                const gbNoteColor   = gbNoteTotal > 0 ? 'var(--fenix-success)' : gbNoteTotal < 0 ? 'var(--fenix-danger)' : '#64748B';
                const gbNoteDisplay = (gbNoteTotal > 0 ? '+' : '') + gbNoteTotal;

                document.getElementById('joueur-panel').innerHTML = jpHeader + `
                    <div class="jp-stats-grid" style="grid-template-columns:repeat(5,1fr)">
                        <div class="jp-stat"><div class="jp-val">${arrets}/${totalFaced}</div><div class="jp-lbl">Arrêts / Tirs</div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:${gbEffColor}">${gbEff}%</div><div class="jp-lbl">Efficacité</div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:var(--fenix-accent)">${gbPd}</div><div class="jp-lbl">PD</div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:var(--fenix-success)">${gbButs}</div><div class="jp-lbl">Buts marqués</div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:${gbNoteColor}">${gbNoteDisplay}</div><div class="jp-lbl">Note GB</div></div>
                    </div>`;
            } else {
                document.getElementById('joueur-panel').innerHTML = jpHeader + `
                    <div class="jp-stats-grid">
                        <div class="jp-stat"><div class="jp-val">${buts}/${total}</div><div class="jp-lbl">But / Tir</div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:${effColor(posteCode, eff, total)}">${eff}%</div><div class="jp-lbl" style="display:flex;align-items:center;justify-content:center;gap:2px;">Efficacité<span class="eff-info-btn" onclick="openEffInfoModal(event,'${posteCode}')">i</span></div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:var(--fenix-accent)">${pd}</div><div class="jp-lbl">PD</div></div>
                        <div class="jp-stat"><div class="jp-val">${po}</div><div class="jp-lbl">Pén. obtenus</div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:var(--fenix-danger)">${pb}</div><div class="jp-lbl">Pertes balle</div></div>
                        <div class="jp-stat"><div class="jp-val" style="color:${noteColor}">${noteDisplay}</div><div class="jp-lbl">Note</div></div>
                    </div>`;
            }

            // ── Tableau détail par match (toute la saison) ───────────────────
            const matchesDiv = document.getElementById('joueur-matches');
            matchesDiv.style.display = 'block';

            if (posteCode === 'GB') {
                const gbSbm = {};
                const initGb = () => ({ ac:0, bc:0, ap:0, bp:0, pd:0, pb:0, but:0 });

                // Tirs adverses → arrêts et buts concédés (lignes adverses, gardien=GB)
                DATA.forEach(row => {
                    if (row[COLS.club] === 'FENIX') return;
                    const g = (row[COLS.gardien] || '').toString().trim();
                    if (!matchPlayerName(g, nom)) return;
                    const m = row[COLS.rencontre]; if (!m) return;
                    if (!gbSbm[m]) gbSbm[m] = initGb();
                    const isPen   = (row[COLS.ge] || '').toString().toLowerCase().includes('pen');
                    const isArret = row[COLS.finalite] === 'Tir arrêté';
                    const isBut   = row[COLS.resultat] === 'But';
                    if (!isArret && !isBut) return;
                    if (isPen) { isArret ? gbSbm[m].ap++ : gbSbm[m].bp++; }
                    else       { isArret ? gbSbm[m].ac++ : gbSbm[m].bc++; }
                });

                // Buts marqués + PB du GB → lignes FENIX, joueur=GB
                DATA.forEach(row => {
                    if (row[COLS.club] !== 'FENIX') return;
                    if (!matchPlayerName((row[COLS.joueur] || '').toString().trim(), nom)) return;
                    const m = row[COLS.rencontre]; if (!m) return;
                    if (!gbSbm[m]) gbSbm[m] = initGb();
                    if (row[COLS.resultat] === 'But') gbSbm[m].but++;
                    if (row[COLS.resultat] === 'PB')  gbSbm[m].pb++;
                });

                // PD → action_joueur (GB) + action_att
                DATA.forEach(row => {
                    const m = row[COLS.rencontre]; if (!m) return;
                    (row[COLS.action_joueur] || '').toString().split(';').forEach((j, i) => {
                        if (!matchPlayerName(j.trim(), nom)) return;
                        const act = lastNonEmpty((row[COLS.action_att] || '').toString().split(';'), i);
                        if (act === 'PD' || act === 'PD DG') {
                            if (!gbSbm[m]) gbSbm[m] = initGb();
                            gbSbm[m].pd++;
                        }
                    });
                });

                let gtot = initGb();
                let gbHTML = '';
                Object.entries(gbSbm).forEach(([m, s]) => {
                    const tC=s.ac+s.bc, tP=s.ap+s.bp, tT=tC+tP, aT=s.ac+s.ap;
                    Object.keys(gtot).forEach(k => gtot[k] += s[k]);
                    const jnumG = (m.match(/^(J\d+)/i)||[])[1];
                    const tjEntryG = TEMPS_JEU[nom.toLowerCase()];
                    const tjMinG = tjEntryG && jnumG && tjEntryG[jnumG] !== undefined ? ` <span style="color:#94A3B8;font-size:0.8em">(${tjEntryG[jnumG]} min)</span>` : '';
                    gbHTML += `<tr>
                        <td style="color:${matchResultColor(m)}">${m}${tjMinG}</td>
                        <td>${aT}/${tT}</td><td>${tT>0?Math.round(aT/tT*100)+'%':'-'}</td>
                        <td>${s.ac}/${tC}</td><td>${tC>0?Math.round(s.ac/tC*100)+'%':'-'}</td>
                        <td>${s.ap}/${tP}</td><td>${tP>0?Math.round(s.ap/tP*100)+'%':'-'}</td>
                        <td>${s.but}</td><td>${s.pd}</td><td>${s.pb}</td>
                    </tr>`;
                });
                const gtC=gtot.ac+gtot.bc, gtP=gtot.ap+gtot.bp, gtT=gtC+gtP, gaT=gtot.ac+gtot.ap;
                gbHTML += `<tr class="jm-total-row">
                    <td>TOTAL</td>
                    <td>${gaT}/${gtT}</td><td>${gtT>0?Math.round(gaT/gtT*100)+'%':'-'}</td>
                    <td>${gtot.ac}/${gtC}</td><td>${gtC>0?Math.round(gtot.ac/gtC*100)+'%':'-'}</td>
                    <td>${gtot.ap}/${gtP}</td><td>${gtP>0?Math.round(gtot.ap/gtP*100)+'%':'-'}</td>
                    <td>${gtot.but}</td><td>${gtot.pd}</td><td>${gtot.pb}</td>
                </tr>`;

                matchesDiv.innerHTML = `
                    <div class="jm-header">📊 DÉTAIL PAR MATCH — ${nom}</div>
                    <div style="overflow-x:auto">
                    <table class="jm-table">
                        <thead><tr>
                            <th>Match</th>
                            <th>Total</th><th>%</th>
                            <th>Champ</th><th>%</th>
                            <th>Pen</th><th>%</th>
                            <th>But</th><th>PD</th><th>PB</th>
                        </tr></thead>
                        <tbody>${gbHTML}</tbody>
                    </table></div>`;

            } else {
                // ── Joueur de champ ───────────────────────────────────────────
                const sbm = {};
                DATA.forEach(row => {
                    if (row[COLS.club] !== 'FENIX') return;
                    if (!matchPlayerName((row[COLS.joueur] || '').toString().trim(), nom)) return;
                    const m = row[COLS.rencontre]; if (!m) return;
                    if (!sbm[m]) sbm[m] = { bc:0, tc:0, bp:0, tp:0, pb:0, po:0, pd:0 };
                    const isPen = (row[COLS.ge] || '').toString().toLowerCase().includes('pen');
                    if (row[COLS.resultat] === 'But')           { isPen ? sbm[m].bp++ : sbm[m].bc++; }
                    else if (row[COLS.resultat] === 'Tir raté') { isPen ? sbm[m].tp++ : sbm[m].tc++; }
                    else if (row[COLS.resultat] === 'PB')  sbm[m].pb++;
                    else if (row[COLS.resultat] === 'PO')  sbm[m].po++;
                });
                DATA.forEach(row => {
                    const m = row[COLS.rencontre]; if (!m) return;
                    (row[COLS.action_joueur] || '').toString().split(';').forEach((j, i) => {
                        if (!matchPlayerName(j.trim(), nom)) return;
                        const act = lastNonEmpty((row[COLS.action_att] || '').toString().split(';'), i);
                        if (act === 'PD' || act === 'PD DG') {
                            if (!sbm[m]) sbm[m] = { bc:0, tc:0, bp:0, tp:0, pb:0, po:0, pd:0 };
                            sbm[m].pd++;
                        }
                    });
                });

                let tot = { bc:0, tc:0, bp:0, tp:0, pb:0, po:0, pd:0 };
                let tbodyHTML = '';
                Object.entries(sbm).forEach(([m, s]) => {
                    const tC=s.bc+s.tc, tP=s.bp+s.tp, tT=tC+tP, tB=s.bc+s.bp;
                    Object.keys(tot).forEach(k => tot[k] += s[k]);
                    const jnum = (m.match(/^(J\d+)/i)||[])[1];
                    const tjEntry = TEMPS_JEU[nom.toLowerCase()];
                    const tjMin = tjEntry && jnum && tjEntry[jnum] !== undefined ? ` <span style="color:#94A3B8;font-size:0.8em">(${tjEntry[jnum]} min)</span>` : '';
                    tbodyHTML += `<tr>
                        <td style="color:${matchResultColor(m)}">${m}${tjMin}</td>
                        <td>${s.bc}/${tC}</td>
                        <td>${tC>0?Math.round(s.bc/tC*100)+'%':'-'}</td>
                        <td>${tP>0?s.bp+'/'+tP:'-'}</td>
                        <td>${tP>0?Math.round(s.bp/tP*100)+'%':'-'}</td>
                        <td>${tT>0?Math.round(tB/tT*100)+'%':'-'}</td>
                        <td>${s.pb}</td><td>${s.po}</td><td>${s.pd}</td>
                    </tr>`;
                });
                const tC=tot.bc+tot.tc, tP=tot.bp+tot.tp, tT=tC+tP, tB=tot.bc+tot.bp;
                tbodyHTML += `<tr class="jm-total-row">
                    <td>TOTAL</td>
                    <td>${tot.bc}/${tC}</td>
                    <td>${tC>0?Math.round(tot.bc/tC*100)+'%':'-'}</td>
                    <td>${tP>0?tot.bp+'/'+tP:'-'}</td>
                    <td>${tP>0?Math.round(tot.bp/tP*100)+'%':'-'}</td>
                    <td>${tT>0?Math.round(tB/tT*100)+'%':'-'}</td>
                    <td>${tot.pb}</td><td>${tot.po}</td><td>${tot.pd}</td>
                </tr>`;

                matchesDiv.innerHTML = `
                    <div class="jm-header">📊 DÉTAIL PAR MATCH — ${nom}</div>
                    <table class="jm-table">
                        <thead><tr>
                            <th>Match</th>
                            <th>But/Tir</th><th>% Champ</th>
                            <th>Pen (B/T)</th><th>% Pen</th><th>% Total</th>
                            <th>PB</th><th>PO</th><th>PD</th>
                        </tr></thead>
                        <tbody>${tbodyHTML}</tbody>
                    </table>`;
            }

            renderCourtPlayers(getPlayersInData());
        }

        // ── Joueurs page update ────────────────────────────────────────────────
        function updateJoueursPage() {
            const warningDiv = document.getElementById('joueur-name-warnings');
            if (warningDiv) {
                const dupes = checkDuplicateNames();
                if (dupes.length > 0) {
                    warningDiv.style.display = 'block';
                    warningDiv.innerHTML = `<div class="joueur-warning-banner">⚠️ Noms en double sur le terrain — stats mélangées : <strong>${dupes.join(', ')}</strong></div>`;
                } else {
                    warningDiv.style.display = 'none';
                }
            }

            const activeNames = getPlayersInData();
            renderCourtPlayers(activeNames);
            if (currentSelectedJoueur) {
                selectJoueur(currentSelectedJoueur);
            } else {
                const md = document.getElementById('joueur-matches');
                if (md) md.style.display = 'none';
            }

        }

        // Modal Joueur
        function openPlayerModal(joueur) {
            document.getElementById('modal-player-name').textContent = '📊 ' + joueur + ' - Stats par match';
            
            // Calculer les stats par match pour ce joueur
            const statsByMatch = {};
            
            // Stats depuis colonne Joueur + Resultat
            DATA.forEach(row => {
                if (row[COLS.club] !== 'FENIX') return;
                if (row[COLS.joueur] !== joueur) return;
                
                const match = row[COLS.rencontre];
                if (!match) return;
                
                if (!statsByMatch[match]) {
                    statsByMatch[match] = { 
                        butsChamp: 0, tirsChamp: 0, 
                        butsPen: 0, tirsPen: 0,
                        pb: 0, po: 0, pd: 0 
                    };
                }
                
                const isPen = row[COLS.ge] && row[COLS.ge].toString().toLowerCase().includes('pen');
                
                if (row[COLS.resultat] === 'But') {
                    if (isPen) statsByMatch[match].butsPen++;
                    else statsByMatch[match].butsChamp++;
                } else if (row[COLS.resultat] === 'Tir raté') {
                    if (isPen) statsByMatch[match].tirsPen++;
                    else statsByMatch[match].tirsChamp++;
                } else if (row[COLS.resultat] === 'PB') {
                    statsByMatch[match].pb++;
                } else if (row[COLS.resultat] === 'PO') {
                    statsByMatch[match].po++;
                }
            });
            
            // PD depuis Action Joueur + Action ATT
            DATA.forEach(row => {
                const match = row[COLS.rencontre];
                if (!match) return;
                
                const actionJoueurs = (row[COLS.action_joueur] || '').toString().split(';');
                const actionsAtt = (row[COLS.action_att] || '').toString().split(';');
                
                actionJoueurs.forEach((j, idx) => {
                    if (j.trim() === joueur) {
                        const action = lastNonEmpty(actionsAtt, idx);
                        if (action === 'PD' || action === 'PD DG') {
                            if (!statsByMatch[match]) {
                                statsByMatch[match] = { butsChamp: 0, tirsChamp: 0, butsPen: 0, tirsPen: 0, pb: 0, po: 0, pd: 0 };
                            }
                            statsByMatch[match].pd++;
                        }
                    }
                });
            });
            
            // Générer le tableau
            const tbody = document.getElementById('modal-player-stats');
            tbody.innerHTML = '';
            
            let totals = { butsChamp: 0, tirsChamp: 0, butsPen: 0, tirsPen: 0, pb: 0, po: 0, pd: 0 };
            
            Object.entries(statsByMatch).forEach(([match, stats]) => {
                const totalChamp = stats.butsChamp + stats.tirsChamp;
                const totalPen = stats.butsPen + stats.tirsPen;
                const totalTirs = totalChamp + totalPen;
                const totalButs = stats.butsChamp + stats.butsPen;
                
                const pctChamp = totalChamp > 0 ? Math.round(stats.butsChamp / totalChamp * 100) : '-';
                const pctPen = totalPen > 0 ? Math.round(stats.butsPen / totalPen * 100) : '-';
                const pctTotal = totalTirs > 0 ? Math.round(totalButs / totalTirs * 100) : '-';
                
                totals.butsChamp += stats.butsChamp;
                totals.tirsChamp += stats.tirsChamp;
                totals.butsPen += stats.butsPen;
                totals.tirsPen += stats.tirsPen;
                totals.pb += stats.pb;
                totals.po += stats.po;
                totals.pd += stats.pd;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${match}</strong></td>
                    <td>${stats.butsChamp}</td>
                    <td>${stats.tirsChamp}</td>
                    <td>${pctChamp}${pctChamp !== '-' ? '%' : ''}</td>
                    <td>${stats.butsPen}/${totalPen}</td>
                    <td>${pctPen}${pctPen !== '-' ? '%' : ''}</td>
                    <td style="font-weight: bold; color: var(--fenix-blue);">${pctTotal}${pctTotal !== '-' ? '%' : ''}</td>
                    <td>${stats.pb}</td>
                    <td>${stats.po}</td>
                    <td>${stats.pd}</td>
                `;
                tbody.appendChild(tr);
            });
            
            // Ligne Total
            const totalChamp = totals.butsChamp + totals.tirsChamp;
            const totalPen = totals.butsPen + totals.tirsPen;
            const totalTirs = totalChamp + totalPen;
            const totalButs = totals.butsChamp + totals.butsPen;
            
            const pctChampTotal = totalChamp > 0 ? Math.round(totals.butsChamp / totalChamp * 100) : 0;
            const pctPenTotal = totalPen > 0 ? Math.round(totals.butsPen / totalPen * 100) : 0;
            const pctTotalTotal = totalTirs > 0 ? Math.round(totalButs / totalTirs * 100) : 0;
            
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td><strong>TOTAL</strong></td>
                <td>${totals.butsChamp}</td>
                <td>${totals.tirsChamp}</td>
                <td>${pctChampTotal}%</td>
                <td>${totals.butsPen}/${totalPen}</td>
                <td>${pctPenTotal}%</td>
                <td style="font-weight: bold;">${pctTotalTotal}%</td>
                <td>${totals.pb}</td>
                <td>${totals.po}</td>
                <td>${totals.pd}</td>
            `;
            tbody.appendChild(totalRow);
            
            document.getElementById('player-modal').style.display = 'flex';
        }

        function closePlayerModal() {
            document.getElementById('player-modal').style.display = 'none';
        }

