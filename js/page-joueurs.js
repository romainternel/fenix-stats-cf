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
                    <div style="flex:1">
                        <div class="jp-name">${nom}</div>
                        <div class="jp-poste-label">${posteCode} — ${posteLabel}</div>
                        ${tjHeaderStr}
                        <button class="jp-print-btn" onclick="printFicheJoueur()">🖨️ Imprimer fiche PDF</button>
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

        async function printFicheJoueur() {
            const panel   = document.getElementById('joueur-panel');
            const matches = document.getElementById('joueur-matches');
            if (!panel || !matches) return;

            const nom = currentSelectedJoueur;
            if (!nom) return;

            const terrainPlayer = JOUEURS_TERRAIN.find(p => p.nom === nom);
            const isGB          = terrainPlayer && terrainPlayer.poste === 'GB';
            const matchFilter   = document.getElementById('filter-joueur-match').value;

            // === 1. Détail complet actions (toutes lignes NOTE_GROUPS, 2 colonnes) ===
            const counts = {};
            const matchSet = new Set();
            DATA.forEach(row => {
                if (matchFilter && row[COLS.rencontre] !== matchFilter) return;
                const joueurs = (row[COLS.action_joueur] || '').toString().split(';');
                const atts    = (row[COLS.action_att]    || '').toString().split(';');
                const defs    = (row[COLS.action_def]    || '').toString().split(';');
                joueurs.forEach((j, idx) => {
                    if (!matchPlayerName(j.trim(), nom)) return;
                    if (row[COLS.rencontre]) matchSet.add(row[COLS.rencontre]);
                    const att = lastNonEmpty(atts, idx);
                    const def = lastNonEmpty(defs, idx);
                    if (att) counts[att] = (counts[att] || 0) + 1;
                    if (def) counts[def] = (counts[def] || 0) + 1;
                });
            });
            const nb = matchSet.size || 1;
            const gc = g => {
                const total = g.main.reduce((s, a) => s + (counts[a] || 0), 0);
                return { total, sub: g.sub ? (counts[g.sub] || 0) : null };
            };
            const buildSection = (groups, color, label) => {
                const rows = groups.map(g => {
                    const { total, sub } = gc(g);
                    const avg  = total > 0 ? (total / nb).toFixed(1) : '-';
                    const cTxt = sub !== null
                        ? `${total} <span style="color:#94A3B8;font-size:0.78em">(${sub})</span>`
                        : (total > 0 ? total : '-');
                    return `<tr style="border-bottom:1px solid #F1F5F9;opacity:${total === 0 ? '0.45' : '1'}">
                        <td style="padding:3px 6px;font-size:0.78rem">${g.label}</td>
                        <td style="padding:3px 6px;text-align:right;font-weight:700;color:${total > 0 ? color : '#CBD5E1'};font-size:0.82rem">${cTxt}</td>
                        <td style="padding:3px 6px;text-align:right;color:#64748B;font-size:0.75rem">${avg}</td>
                    </tr>`;
                }).join('');
                return `<div style="border:1px solid #E2E8F0;border-radius:6px;overflow:hidden">
                    <div style="background:${color};color:white;padding:4px 8px;font-weight:700;font-size:0.75rem;letter-spacing:1px">${label}</div>
                    <table style="width:100%;border-collapse:collapse">
                        <thead><tr style="background:#F8FAFC">
                            <th style="padding:2px 6px;text-align:left;font-size:0.68rem;color:#94A3B8;font-weight:600">ACTION</th>
                            <th style="padding:2px 6px;text-align:right;font-size:0.68rem;color:#94A3B8;font-weight:600">TOTAL</th>
                            <th style="padding:2px 6px;text-align:right;font-size:0.68rem;color:#94A3B8;font-weight:600">/MATCH</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
            };
            const totAP = NOTE_GROUPS.attPlus.reduce((s, g)  => s + gc(g).total, 0);
            const totAM = NOTE_GROUPS.attMoins.reduce((s, g) => s + gc(g).total, 0);
            const totDP = NOTE_GROUPS.defPlus.reduce((s, g)  => s + gc(g).total, 0);
            const totDM = NOTE_GROUPS.defMoins.reduce((s, g) => s + gc(g).total, 0);
            const noteAtt   = totAP - totAM;
            const noteDef   = totDP - totDM;
            const noteTotal = noteAtt + noteDef;
            const sign      = v => (v >= 0 ? '+' : '') + v;
            const ntColor   = noteTotal >= 0 ? '#10B981' : '#EF4444';
            const naColor   = noteAtt   >= 0 ? '#10B981' : '#EF4444';
            const ndColor   = noteDef   >= 0 ? '#10B981' : '#EF4444';

            const actionCardHTML = `
                <div style="margin:12px 0">
                    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.05rem;color:#0A2463;margin-bottom:8px;letter-spacing:1.5px">DÉTAIL DES ACTIONS — ${nb} MATCH${nb > 1 ? 'S' : ''}</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                        ${buildSection(NOTE_GROUPS.attPlus,  '#10B981', 'ATTAQUE +')}
                        ${buildSection(NOTE_GROUPS.defPlus,  '#10B981', 'DÉFENSE +')}
                        ${buildSection(NOTE_GROUPS.attMoins, '#EF4444', 'ATTAQUE -')}
                        ${buildSection(NOTE_GROUPS.defMoins, '#EF4444', 'DÉFENSE -')}
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center;border-top:2px solid #0A2463;margin-top:10px;padding-top:8px">
                        <div><div style="font-weight:700;font-size:1.1rem;color:${naColor}">${sign(noteAtt)}</div><div style="font-size:0.72rem;color:#64748B">Note ATT</div></div>
                        <div><div style="font-weight:700;font-size:1.1rem;color:${ndColor}">${sign(noteDef)}</div><div style="font-size:0.72rem;color:#64748B">Note DEF</div></div>
                        <div><div style="font-weight:700;font-size:1.3rem;color:${ntColor}">${sign(noteTotal)}</div><div style="font-size:0.72rem;color:#64748B">Note globale</div></div>
                    </div>
                </div>`;

            // === 2. Note graph — offscreen Chart.js (animation:false, responsive:false) ===
            let graphImgHTML = '';
            try {
                const matchData = {};
                MATCHS.forEach(m => matchData[m] = { ap: 0, am: 0, dp: 0, dm: 0 });
                DATA.forEach(row => {
                    const m = row[COLS.rencontre];
                    if (!matchData[m]) return;
                    (row[COLS.action_joueur] || '').toString().split(';').forEach((j, idx) => {
                        if (!matchPlayerName(j.trim(), nom)) return;
                        const att = lastNonEmpty((row[COLS.action_att] || '').toString().split(';'), idx);
                        const def = lastNonEmpty((row[COLS.action_def] || '').toString().split(';'), idx);
                        if (isPositiveATT(att)) matchData[m].ap++;
                        if (isNegativeATT(att)) matchData[m].am++;
                        if (isPositiveDEF(def)) matchData[m].dp++;
                        if (isNegativeDEF(def)) matchData[m].dm++;
                    });
                });
                const played = MATCHS.filter(m => { const d = matchData[m]; return d.ap+d.am+d.dp+d.dm > 0; });
                if (played.length > 0) {
                    const noteATTArr = played.map(m => matchData[m].ap - matchData[m].am);
                    const noteDEFArr = played.map(m => matchData[m].dp - matchData[m].dm);
                    const totalArr   = played.map((_, i) => noteATTArr[i] + noteDEFArr[i]);
                    const sorted = [...totalArr].sort((a, b) => a - b);
                    const mid    = Math.floor(sorted.length / 2);
                    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
                    const xMean  = (totalArr.length - 1) / 2;
                    const yMean  = totalArr.reduce((s, v) => s + v, 0) / totalArr.length;
                    let num = 0, den = 0;
                    totalArr.forEach((v, i) => { num += (i - xMean) * (v - yMean); den += (i - xMean) ** 2; });
                    const slope = den === 0 ? 0 : num / den;
                    const trend = played.map((_, i) => +(slope * i + (yMean - slope * xMean)).toFixed(2));

                    const tmpC = document.createElement('canvas');
                    tmpC.width = 800; tmpC.height = 280;
                    tmpC.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
                    document.body.appendChild(tmpC);
                    const tmpChart = new Chart(tmpC.getContext('2d'), {
                        data: {
                            labels: played,
                            datasets: [
                                { type:'bar',  label:'NOTE ATT', data:noteATTArr, backgroundColor:'rgba(20,184,166,0.75)', borderColor:'#14B8A6', borderWidth:1, order:4 },
                                { type:'bar',  label:'NOTE DEF', data:noteDEFArr, backgroundColor:'rgba(245,158,11,0.75)', borderColor:'#F59E0B', borderWidth:1, order:5 },
                                { type:'line', label:'TOTAL',    data:totalArr,   borderColor:'#1E3A5F', backgroundColor:'#1E3A5F', borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#1E3A5F', tension:0.3, order:1 },
                                { type:'line', label:'Médiane',  data:played.map(()=>median), borderColor:'#94A3B8', borderWidth:1.5, borderDash:[6,4], pointRadius:0, order:2 },
                                { type:'line', label:'Tendance', data:trend, borderColor:'#60A5FA', borderWidth:1.5, borderDash:[3,3], pointRadius:0, order:3 },
                                { type:'line', label:'__zero__', data:played.map(()=>0), borderColor:'#1E3A5F', borderWidth:1, pointRadius:0, order:6 },
                            ],
                        },
                        options: {
                            animation: false,
                            responsive: false,
                            plugins: {
                                title: { display:true, text:`Notes par rencontre — ${nom}`, font:{size:16,weight:'bold',family:'Bebas Neue'}, color:'#1E3A5F', padding:{bottom:10} },
                                legend: { position:'bottom', labels:{font:{size:11},padding:14,usePointStyle:true,filter:item=>item.text!=='__zero__'} },
                            },
                            scales: {
                                x: { ticks:{font:{size:11},maxRotation:30}, grid:{display:false} },
                                y: { title:{display:true,text:'Note'}, grid:{color:'#F1F5F9'}, afterDataLimits(s){s.max+=1;s.min-=1;} },
                            },
                        },
                    });
                    const graphImg = tmpC.toDataURL('image/png');
                    tmpChart.destroy();
                    document.body.removeChild(tmpC);
                    graphImgHTML = `
                        <div style="margin:16px 0;page-break-inside:avoid">
                            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.05rem;color:#0A2463;margin-bottom:6px;letter-spacing:1.5px">PROGRESSION DES NOTES</div>
                            <img src="${graphImg}" style="width:100%;border-radius:8px;border:1px solid #E2E8F0"/>
                        </div>`;
                }
            } catch(e) { console.warn('PDF graph error:', e); }

            // === 3. Impact — images rechargées avec crossOrigin pour éviter le taint canvas ===
            let impactHTML = '';
            try {
                // Charger les images de fond avec CORS pour que toDataURL() fonctionne
                const loadCORS = src => new Promise(res => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload  = () => res(img);
                    img.onerror = () => res(null);
                    img.src = src;
                });
                const [imgALG, imgFace, imgALD] = await Promise.all([
                    loadCORS('ALG.png'),
                    loadCORS('TERRAIN HB TIR.png'),
                    loadCORS('ALD.png'),
                ]);

                // Filtre données : joueur de champ → tirs FENIX / GB → tirs adverses (gardien)
                const impactRows = isGB
                    ? DATA.filter(row =>
                        row[COLS.club] !== 'FENIX' &&
                        (row[COLS.finalite] === 'Tir arrêté' || row[COLS.resultat] === 'But') &&
                        row[COLS.impact] && String(row[COLS.impact]).includes(';') &&
                        matchPlayerName((row[COLS.gardien] || '').toString().trim(), nom)
                    )
                    : DATA.filter(row =>
                        row[COLS.club] === 'FENIX' &&
                        ['But', 'Tir raté'].includes(row[COLS.resultat]) &&
                        row[COLS.impact] && String(row[COLS.impact]).includes(';') &&
                        matchPlayerName((row[COLS.joueur] || '').toString().trim(), nom)
                    );

                const drawOS = (img, data, w, h) => {
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    const ctx = c.getContext('2d');
                    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, w, h);
                    let dx=0, dy=0, dw=w, dh=h;
                    if (img && img.naturalWidth > 0) {
                        const ar=img.naturalWidth/img.naturalHeight, car=w/h;
                        if (ar>car){dh=w/ar;dy=(h-dh)/2;}else{dw=h*ar;dx=(w-dw)/2;}
                        ctx.drawImage(img, dx, dy, dw, dh);
                    }
                    data.forEach(row => {
                        const p=String(row[COLS.impact]).split(';');
                        const x=parseFloat(p[0]),y=parseFloat(p[1]);
                        if(isNaN(x)||isNaN(y)) return;
                        const dotX=dx+(x/100)*dw, dotY=dy+(y/100)*dh, s=6;
                        ctx.save();
                        const isPositive = isGB ? row[COLS.finalite]==='Tir arrêté' : row[COLS.resultat]==='But';
                        if(isPositive){
                            ctx.beginPath();ctx.arc(dotX,dotY,s,0,Math.PI*2);
                            ctx.fillStyle='#10B981';ctx.fill();
                            ctx.strokeStyle='white';ctx.lineWidth=1.5;ctx.stroke();
                        } else {
                            const sc=s/Math.SQRT2;ctx.strokeStyle='#EF4444';ctx.lineWidth=2.5;
                            ctx.beginPath();ctx.moveTo(dotX-sc,dotY-sc);ctx.lineTo(dotX+sc,dotY+sc);
                            ctx.moveTo(dotX+sc,dotY-sc);ctx.lineTo(dotX-sc,dotY+sc);ctx.stroke();
                        }
                        ctx.restore();
                    });
                    return c.toDataURL('image/png');
                };

                const total    = impactRows.length;
                const positifs = isGB
                    ? impactRows.filter(r=>r[COLS.finalite]==='Tir arrêté').length
                    : impactRows.filter(r=>r[COLS.resultat]==='But').length;
                if (total > 0) {
                    const pct   = Math.round(positifs/total*100);
                    const titre = isGB ? `ZONES D'ARRÊT — ${positifs} arrêts / ${total} tirs (${pct}%)` : `ZONES DE TIR — ${positifs}/${total} (${pct}%)`;
                    const dALG  = drawOS(imgALG,  impactRows.filter(r=>getImpactView(r)==='alg'),  320, 200);
                    const dFace = drawOS(imgFace, impactRows.filter(r=>getImpactView(r)==='face'), 320, 200);
                    const dALD  = drawOS(imgALD,  impactRows.filter(r=>getImpactView(r)==='ald'),  320, 200);
                    impactHTML = `
                        <div style="margin:16px 0;page-break-inside:avoid">
                            <div style="font-family:'Bebas Neue',sans-serif;font-size:1.05rem;color:#0A2463;margin-bottom:6px;letter-spacing:1.5px">${titre}</div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
                                <div style="text-align:center"><img src="${dALG}" style="width:100%;border-radius:6px;border:1px solid #E2E8F0"/><div style="font-size:0.72rem;color:#64748B;margin-top:3px;font-weight:600">EXT GAUCHE</div></div>
                                <div style="text-align:center"><img src="${dFace}" style="width:100%;border-radius:6px;border:1px solid #E2E8F0"/><div style="font-size:0.72rem;color:#64748B;margin-top:3px;font-weight:600">CENTRAL</div></div>
                                <div style="text-align:center"><img src="${dALD}" style="width:100%;border-radius:6px;border:1px solid #E2E8F0"/><div style="font-size:0.72rem;color:#64748B;margin-top:3px;font-weight:600">EXT DROIT</div></div>
                            </div>
                        </div>`;
                }
            } catch(e) { console.error('PDF impact error:', e); }

            const printZone = document.getElementById('joueur-print-zone');
            printZone.innerHTML =
                '<div class="print-fenix-header">FENIX HANDBALL — Centre de Formation</div>' +
                panel.outerHTML +
                actionCardHTML +
                matches.outerHTML +
                graphImgHTML +
                impactHTML;

            window.addEventListener('afterprint', function cleanup() {
                printZone.innerHTML = '';
                window.removeEventListener('afterprint', cleanup);
            });
            window.print();
        }

