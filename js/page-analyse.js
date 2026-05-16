        // ===== PAGE ANALYSE =====
        let coachAnalyses = JSON.parse(localStorage.getItem('fenix_coach_analyses') || '{}');
        let chatHistory = [];

        function updateAnalysePage() {
            const matchFilter = document.getElementById('filter-analyse-match').value;
            
            if (!matchFilter) {
                document.getElementById('analyse-content').style.display = 'none';
                document.getElementById('analyse-empty').style.display = 'block';
                return;
            }
            
            document.getElementById('analyse-content').style.display = 'block';
            document.getElementById('analyse-empty').style.display = 'none';
            
            const matchData = DATA.filter(row => row[COLS.rencontre] === matchFilter);
            
            // Charger l'analyse coach sauvegardée
            document.getElementById('coach-analyse').value = coachAnalyses[matchFilter] || '';
            
            // Reset chat
            chatHistory = [];
            document.getElementById('chat-messages').innerHTML = `
                <div class="chat-message ia">
                    <div class="chat-avatar">🤖</div>
                    <div class="chat-content">Salut Coach ! Je suis prêt à analyser le match <strong>${matchFilter}</strong> avec toi. Pose-moi tes questions !</div>
                </div>
            `;
            
            // Générer l'analyse
            generateIAAnalyse(matchFilter, matchData);
            generateIndicateurs(matchFilter, matchData);
            drawTimeline(matchFilter, matchData);
            findMomentsCles(matchFilter, matchData);
        }

        function generateIAAnalyse(matchName, matchData) {
            const fenixData = matchData.filter(row => row[COLS.club] === 'FENIX');
            const advData = matchData.filter(row => row[COLS.club] !== 'FENIX');
            
            // Calculs
            const fenixButs = fenixData.filter(row => row[COLS.resultat] === 'But').length;
            const advButs = advData.filter(row => row[COLS.resultat] === 'But').length;
            const fenixTirs = fenixButs + fenixData.filter(row => row[COLS.resultat] === 'Tir raté').length;
            const advTirs = advButs + advData.filter(row => row[COLS.resultat] === 'Tir raté').length;
            const fenixEff = fenixTirs > 0 ? Math.round(fenixButs / fenixTirs * 100) : 0;
            const advEff = advTirs > 0 ? Math.round(advButs / advTirs * 100) : 0;
            const fenixPB = fenixData.filter(row => row[COLS.resultat] === 'PB').length;
            const advPB = advData.filter(row => row[COLS.resultat] === 'PB').length;
            const fenixPoss = fenixData.filter(row => row[COLS.possession]).length;
            const advPoss = advData.filter(row => row[COLS.possession]).length;
            
            // Gardien
            const fenixTirsSubis = advData.filter(row => row[COLS.resultat] === 'But' || row[COLS.resultat] === 'Tir raté').length;
            const fenixArrets = advData.filter(row => row[COLS.resultat] === 'Tir raté').length;
            const fenixGardienEff = fenixTirsSubis > 0 ? Math.round(fenixArrets / fenixTirsSubis * 100) : 0;
            
            const advTirsSubis = fenixData.filter(row => row[COLS.resultat] === 'But' || row[COLS.resultat] === 'Tir raté').length;
            const advArrets = fenixData.filter(row => row[COLS.resultat] === 'Tir raté').length;
            const advGardienEff = advTirsSubis > 0 ? Math.round(advArrets / advTirsSubis * 100) : 0;
            
            // Déterminer V/D/N
            let resultClass, resultText;
            if (fenixButs > advButs) {
                resultClass = 'victoire';
                resultText = `✅ VICTOIRE ${fenixButs}-${advButs}`;
            } else if (fenixButs < advButs) {
                resultClass = 'defaite';
                resultText = `❌ DÉFAITE ${fenixButs}-${advButs}`;
            } else {
                resultClass = 'nul';
                resultText = `➖ MATCH NUL ${fenixButs}-${advButs}`;
            }
            
            // Analyser les causes
            const causes = [];
            const points = [];
            
            // Efficacité
            if (fenixEff < advEff - 5) {
                causes.push(`Efficacité au tir insuffisante (${fenixEff}% vs ${advEff}%)`);
                points.push({ icon: '🎯', text: `Efficacité: ${fenixEff}% vs ${advEff}% adversaire`, type: 'negatif' });
            } else if (fenixEff > advEff + 5) {
                points.push({ icon: '🎯', text: `Bonne efficacité: ${fenixEff}% vs ${advEff}%`, type: 'positif' });
            }
            
            // Pertes de balle
            if (fenixPB > advPB + 2) {
                causes.push(`Trop de pertes de balle (${fenixPB} vs ${advPB})`);
                points.push({ icon: '🔴', text: `${fenixPB} pertes de balle (vs ${advPB})`, type: 'negatif' });
            } else if (fenixPB < advPB - 2) {
                points.push({ icon: '✅', text: `Maîtrise du ballon: seulement ${fenixPB} PB`, type: 'positif' });
            }
            
            // Gardien
            if (fenixGardienEff < advGardienEff - 5) {
                causes.push(`Gardien en difficulté (${fenixGardienEff}% vs ${advGardienEff}%)`);
                points.push({ icon: '🧤', text: `Gardien: ${fenixGardienEff}% d'arrêts (vs ${advGardienEff}%)`, type: 'negatif' });
            } else if (fenixGardienEff > advGardienEff + 5) {
                points.push({ icon: '🧤', text: `Bon match du gardien: ${fenixGardienEff}% d'arrêts`, type: 'positif' });
            }
            
            // Possessions
            if (fenixPoss < advPoss - 3) {
                points.push({ icon: '⏱️', text: `Moins de possessions (${fenixPoss} vs ${advPoss})`, type: 'negatif' });
            }
            
            // Construire le HTML
            let html = `<div class="ia-diagnostic ${resultClass}"><h4>${resultText}</h4>`;
            
            if (resultClass === 'defaite' && causes.length > 0) {
                html += `<p><strong>Causes probables :</strong></p><ul>`;
                causes.forEach(c => html += `<li>${c}</li>`);
                html += `</ul>`;
            } else if (resultClass === 'victoire') {
                html += `<p>Belle performance de l'équipe !</p>`;
            }
            html += `</div>`;
            
            // Points d'analyse
            points.forEach(p => {
                html += `<div class="ia-point"><span class="ia-point-icon">${p.icon}</span><span>${p.text}</span></div>`;
            });
            
            document.getElementById('ia-analyse').innerHTML = html;
        }

        function generateIndicateurs(matchName, matchData) {
            const fenixData = matchData.filter(row => row[COLS.club] === 'FENIX');
            const advData = matchData.filter(row => row[COLS.club] !== 'FENIX');
            
            const indicators = [
                { label: 'Buts', fenix: fenixData.filter(r => r[COLS.resultat] === 'But').length, adv: advData.filter(r => r[COLS.resultat] === 'But').length },
                { label: 'Tirs', fenix: fenixData.filter(r => r[COLS.resultat] === 'But' || r[COLS.resultat] === 'Tir raté').length, adv: advData.filter(r => r[COLS.resultat] === 'But' || r[COLS.resultat] === 'Tir raté').length },
                { label: 'Efficacité', fenix: 0, adv: 0, isPct: true },
                { label: 'Pertes de balle', fenix: fenixData.filter(r => r[COLS.resultat] === 'PB').length, adv: advData.filter(r => r[COLS.resultat] === 'PB').length, inverse: true },
                { label: 'Possessions', fenix: fenixData.filter(r => r[COLS.possession]).length, adv: advData.filter(r => r[COLS.possession]).length },
                { label: 'Neutralisé', fenix: fenixData.filter(r => r[COLS.resultat] === 'Jet franc').length, adv: advData.filter(r => r[COLS.resultat] === 'Jet franc').length }
            ];
            
            // Calculer efficacité
            const fenixButs = indicators[0].fenix;
            const fenixTirs = indicators[1].fenix;
            const advButs = indicators[0].adv;
            const advTirs = indicators[1].adv;
            indicators[2].fenix = fenixTirs > 0 ? Math.round(fenixButs / fenixTirs * 100) : 0;
            indicators[2].adv = advTirs > 0 ? Math.round(advButs / advTirs * 100) : 0;
            
            let html = '';
            indicators.forEach(ind => {
                let cardClass = '';
                if (ind.inverse) {
                    cardClass = ind.fenix < ind.adv ? 'avantage' : (ind.fenix > ind.adv ? 'desavantage' : '');
                } else {
                    cardClass = ind.fenix > ind.adv ? 'avantage' : (ind.fenix < ind.adv ? 'desavantage' : '');
                }
                
                html += `
                    <div class="indicateur-card ${cardClass}">
                        <div class="indicateur-label">${ind.label}</div>
                        <div class="indicateur-values">
                            <span class="indicateur-fenix">${ind.fenix}${ind.isPct ? '%' : ''}</span>
                            <span class="indicateur-vs">vs</span>
                            <span class="indicateur-adv">${ind.adv}${ind.isPct ? '%' : ''}</span>
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('indicateurs-grid').innerHTML = html;
        }

        function drawTimeline(matchName, matchData) {
            const canvas = document.getElementById('timeline-canvas');
            const container = canvas.parentElement;
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Reconstituer l'évolution du score
            const actions = matchData.filter(row => row[COLS.resultat] === 'But').sort((a, b) => {
                const posA = parseInt(a[COLS.position]) || 0;
                const posB = parseInt(b[COLS.position]) || 0;
                return posA - posB;
            });
            
            if (actions.length === 0) return;
            
            let fenixScore = 0, advScore = 0;
            const scoreHistory = [{ pos: 0, fenix: 0, adv: 0 }];
            
            actions.forEach(action => {
                if (action[COLS.club] === 'FENIX') fenixScore++;
                else advScore++;
                scoreHistory.push({
                    pos: parseInt(action[COLS.position]) || scoreHistory.length,
                    fenix: fenixScore,
                    adv: advScore
                });
            });
            
            const padding = { top: 40, right: 30, bottom: 50, left: 45 };
            const graphWidth = canvas.width - padding.left - padding.right;
            const graphHeight = canvas.height - padding.top - padding.bottom;
            
            const maxScore = Math.max(fenixScore, advScore, 5);
            const roundedMax = Math.ceil(maxScore / 5) * 5; // Arrondir à 5
            const maxPos = scoreHistory[scoreHistory.length - 1].pos || scoreHistory.length;
            
            // Grille horizontale
            ctx.strokeStyle = '#E5E7EB';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (graphHeight * (5 - i) / 5);
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(canvas.width - padding.right, y);
                ctx.stroke();
            }
            
            // Axe Y labels
            ctx.fillStyle = '#6B7280';
            ctx.font = '11px Inter';
            ctx.textAlign = 'right';
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (graphHeight * (5 - i) / 5);
                const val = Math.round(roundedMax * i / 5);
                ctx.fillText(val.toString(), padding.left - 8, y + 4);
            }
            
            // Dessiner la courbe FENIX (bleu)
            ctx.strokeStyle = '#0A2463';
            ctx.lineWidth = 3;
            ctx.beginPath();
            scoreHistory.forEach((point, i) => {
                const x = padding.left + (point.pos / maxPos) * graphWidth;
                const y = padding.top + graphHeight - (point.fenix / roundedMax * graphHeight);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            
            // Points FENIX
            scoreHistory.forEach((point, i) => {
                if (i === 0) return;
                const x = padding.left + (point.pos / maxPos) * graphWidth;
                const y = padding.top + graphHeight - (point.fenix / roundedMax * graphHeight);
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#0A2463';
                ctx.fill();
            });
            
            // Dessiner la courbe Adversaire (rouge)
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 3;
            ctx.beginPath();
            scoreHistory.forEach((point, i) => {
                const x = padding.left + (point.pos / maxPos) * graphWidth;
                const y = padding.top + graphHeight - (point.adv / roundedMax * graphHeight);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            
            // Points Adversaire
            scoreHistory.forEach((point, i) => {
                if (i === 0) return;
                const x = padding.left + (point.pos / maxPos) * graphWidth;
                const y = padding.top + graphHeight - (point.adv / roundedMax * graphHeight);
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#DC2626';
                ctx.fill();
            });
            
            // Score final en haut à droite
            ctx.font = 'bold 16px Inter';
            ctx.textAlign = 'right';
            ctx.fillStyle = '#0A2463';
            ctx.fillText(fenixScore.toString(), canvas.width - padding.right - 30, padding.top - 15);
            ctx.fillStyle = '#6B7280';
            ctx.fillText(' - ', canvas.width - padding.right - 20, padding.top - 15);
            ctx.fillStyle = '#DC2626';
            ctx.fillText(advScore.toString(), canvas.width - padding.right, padding.top - 15);
            
            // Légende en bas
            ctx.font = '12px Inter';
            ctx.textAlign = 'left';
            
            // Carré bleu + texte FENIX
            ctx.fillStyle = '#0A2463';
            ctx.fillRect(padding.left, canvas.height - 20, 12, 12);
            ctx.fillStyle = '#333';
            ctx.fillText('FENIX', padding.left + 18, canvas.height - 10);
            
            // Carré rouge + texte Adversaire
            ctx.fillStyle = '#DC2626';
            ctx.fillRect(padding.left + 80, canvas.height - 20, 12, 12);
            ctx.fillStyle = '#333';
            ctx.fillText('Adversaire', padding.left + 98, canvas.height - 10);
        }

        function findMomentsCles(matchName, matchData) {
            const actions = matchData.filter(row => row[COLS.resultat] === 'But').sort((a, b) => {
                const posA = parseInt(a[COLS.position]) || 0;
                const posB = parseInt(b[COLS.position]) || 0;
                return posA - posB;
            });
            
            if (actions.length < 3) {
                document.getElementById('moments-cles').innerHTML = '<p style="color:#6B7280;font-size:0.85rem;">Pas assez de données pour identifier des séquences.</p>';
                return;
            }
            
            // Trouver les séquences
            const moments = [];
            let currentSeq = { team: null, count: 0, start: 0 };
            
            actions.forEach((action, i) => {
                const team = action[COLS.club] === 'FENIX' ? 'FENIX' : 'ADV';
                
                if (team === currentSeq.team) {
                    currentSeq.count++;
                } else {
                    if (currentSeq.count >= 3) {
                        moments.push({
                            text: currentSeq.team === 'FENIX' 
                                ? `Série de ${currentSeq.count} buts FENIX` 
                                : `${currentSeq.count} buts encaissés d'affilée`,
                            type: currentSeq.team === 'FENIX' ? 'positif' : 'negatif'
                        });
                    }
                    currentSeq = { team: team, count: 1, start: i };
                }
            });
            
            // Vérifier la dernière séquence
            if (currentSeq.count >= 3) {
                moments.push({
                    text: currentSeq.team === 'FENIX' 
                        ? `Série de ${currentSeq.count} buts FENIX` 
                        : `${currentSeq.count} buts encaissés d'affilée`,
                    type: currentSeq.team === 'FENIX' ? 'positif' : 'negatif'
                });
            }
            
            if (moments.length === 0) {
                document.getElementById('moments-cles').innerHTML = '<p style="color:#6B7280;font-size:0.85rem;">Pas de séquence marquante détectée.</p>';
                return;
            }
            
            let html = '<strong style="font-size:0.85rem;color:#333;">Moments clés :</strong> ';
            moments.forEach(m => {
                html += `<span class="moment-badge ${m.type}">${m.text}</span> `;
            });
            
            document.getElementById('moments-cles').innerHTML = html;
        }

        function saveCoachAnalyse() {
            const matchFilter = document.getElementById('filter-analyse-match').value;
            if (!matchFilter) return;
            
            const analyse = document.getElementById('coach-analyse').value;
            coachAnalyses[matchFilter] = analyse;
            localStorage.setItem('fenix_coach_analyses', JSON.stringify(coachAnalyses));
            
            const msg = document.getElementById('coach-saved-msg');
            msg.style.display = 'block';
            setTimeout(() => msg.style.display = 'none', 2000);
        }

        function sendChatMessage() {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            if (!message) return;
            
            const matchFilter = document.getElementById('filter-analyse-match').value;
            if (!matchFilter) return;
            
            // Ajouter message utilisateur
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML += `
                <div class="chat-message user">
                    <div class="chat-avatar">👨‍🏫</div>
                    <div class="chat-content">${message}</div>
                </div>
            `;
            
            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Ajouter loading
            chatMessages.innerHTML += `
                <div class="chat-message ia" id="chat-loading">
                    <div class="chat-avatar">🤖</div>
                    <div class="chat-content">
                        <div class="chat-loading"><span></span><span></span><span></span></div>
                    </div>
                </div>
            `;
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Générer réponse IA (locale pour l'instant)
            setTimeout(() => {
                document.getElementById('chat-loading').remove();
                const response = generateChatResponse(message, matchFilter);
                chatMessages.innerHTML += `
                    <div class="chat-message ia">
                        <div class="chat-avatar">🤖</div>
                        <div class="chat-content">${response}</div>
                    </div>
                `;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 800);
        }

        function generateChatResponse(question, matchName) {
            const matchData = DATA.filter(row => row[COLS.rencontre] === matchName);
            const fenixData = matchData.filter(row => row[COLS.club] === 'FENIX');
            const advData = matchData.filter(row => row[COLS.club] !== 'FENIX');
            
            const q = question.toLowerCase();
            
            // Stats de base
            const fenixButs = fenixData.filter(r => r[COLS.resultat] === 'But').length;
            const advButs = advData.filter(r => r[COLS.resultat] === 'But').length;
            const fenixTirs = fenixButs + fenixData.filter(r => r[COLS.resultat] === 'Tir raté').length;
            const fenixEff = fenixTirs > 0 ? Math.round(fenixButs / fenixTirs * 100) : 0;
            const fenixPB = fenixData.filter(r => r[COLS.resultat] === 'PB').length;
            
            // ===== ENCLENCHEMENTS =====
            if (q.includes('enclenchement') || q.includes('marqué') || q.includes('comment on a marqué') || q.includes('type de but')) {
                const fenixButsData = fenixData.filter(r => r[COLS.resultat] === 'But');
                const enclenchements = {};
                fenixButsData.forEach(r => {
                    const enc = r[COLS.enclenchement] || 'Non renseigné';
                    enclenchements[enc] = (enclenchements[enc] || 0) + 1;
                });
                
                const sorted = Object.entries(enclenchements).sort((a, b) => b[1] - a[1]);
                let response = `<strong>Enclenchements des ${fenixButs} buts FENIX :</strong><br>`;
                sorted.forEach(([enc, count]) => {
                    response += `• ${enc} : ${count} but(s)<br>`;
                });
                return response;
            }
            
            if (q.includes('adversaire') && (q.includes('enclenchement') || q.includes('marqué'))) {
                const advButsData = advData.filter(r => r[COLS.resultat] === 'But');
                const enclenchements = {};
                advButsData.forEach(r => {
                    const enc = r[COLS.enclenchement] || 'Non renseigné';
                    enclenchements[enc] = (enclenchements[enc] || 0) + 1;
                });
                
                const sorted = Object.entries(enclenchements).sort((a, b) => b[1] - a[1]);
                let response = `<strong>Enclenchements des ${advButs} buts adverses :</strong><br>`;
                sorted.forEach(([enc, count]) => {
                    response += `• ${enc} : ${count} but(s)<br>`;
                });
                return response;
            }
            
            // ===== SUPÉRIORITÉS NUMÉRIQUES =====
            if (q.includes('supériorité') || q.includes('sup') || q.includes('infériorité') || q.includes('inf') || q.includes('+ -') || q.includes('+/-')) {
                // FENIX en supériorité (adversaire en -)
                const fenixSupData = fenixData.filter(r => {
                    const phase = (r[COLS.phase_att] || '').toString();
                    return phase.includes('+');
                });
                const fenixSupButs = fenixSupData.filter(r => r[COLS.resultat] === 'But').length;
                const fenixSupTirs = fenixSupButs + fenixSupData.filter(r => r[COLS.resultat] === 'Tir raté').length;
                
                // FENIX en infériorité (adversaire en +)
                const fenixInfData = fenixData.filter(r => {
                    const phase = (r[COLS.phase_att] || '').toString();
                    return phase.includes('-');
                });
                const fenixInfButs = fenixInfData.filter(r => r[COLS.resultat] === 'But').length;
                const fenixInfTirs = fenixInfButs + fenixInfData.filter(r => r[COLS.resultat] === 'Tir raté').length;
                
                // Adversaire en supériorité
                const advSupData = advData.filter(r => {
                    const phase = (r[COLS.phase_att] || '').toString();
                    return phase.includes('+');
                });
                const advSupButs = advSupData.filter(r => r[COLS.resultat] === 'But').length;
                const advSupTirs = advSupButs + advSupData.filter(r => r[COLS.resultat] === 'Tir raté').length;
                
                // Adversaire en infériorité
                const advInfData = advData.filter(r => {
                    const phase = (r[COLS.phase_att] || '').toString();
                    return phase.includes('-');
                });
                const advInfButs = advInfData.filter(r => r[COLS.resultat] === 'But').length;
                
                // Bilan
                const fenixGagne = fenixSupButs > advSupButs;
                const bilan = fenixGagne ? '✅ FENIX gagne les supériorités' : (fenixSupButs < advSupButs ? '❌ Adversaire gagne les supériorités' : '➖ Égalité');
                
                let response = `<strong>Supériorités numériques :</strong><br><br>`;
                response += `<strong>FENIX en supériorité (+) :</strong> ${fenixSupButs}/${fenixSupTirs} tirs<br>`;
                response += `<strong>FENIX en infériorité (-) :</strong> ${fenixInfButs}/${fenixInfTirs} tirs<br><br>`;
                response += `<strong>Adversaire en supériorité (+) :</strong> ${advSupButs}/${advSupTirs} tirs<br>`;
                response += `<strong>Adversaire en infériorité (-) :</strong> ${advInfButs} buts<br><br>`;
                response += `<strong>Bilan :</strong> ${bilan}`;
                
                return response;
            }
            
            // Réponses contextuelles existantes
            if (q.includes('perdu') || q.includes('défaite') || q.includes('pourquoi')) {
                if (fenixButs < advButs) {
                    const causes = [];
                    if (fenixEff < 55) causes.push(`efficacité insuffisante (${fenixEff}%)`);
                    if (fenixPB > 5) causes.push(`trop de pertes de balle (${fenixPB})`);
                    return `La défaite s'explique probablement par : ${causes.join(', ') || 'un écart de niveau global'}. Score final: ${fenixButs}-${advButs}.`;
                }
                return `En fait, vous avez gagné ce match ${fenixButs}-${advButs} ! 🎉`;
            }
            
            if (q.includes('efficace') || q.includes('meilleur') || q.includes('buteur')) {
                const playerButs = {};
                fenixData.filter(r => r[COLS.resultat] === 'But').forEach(r => {
                    const joueur = r[COLS.joueur];
                    if (joueur) playerButs[joueur] = (playerButs[joueur] || 0) + 1;
                });
                const sorted = Object.entries(playerButs).sort((a, b) => b[1] - a[1]);
                if (sorted.length > 0) {
                    return `Le meilleur buteur du match est <strong>${sorted[0][0]}</strong> avec ${sorted[0][1]} but(s). ${sorted.length > 1 ? `Suivi de ${sorted[1][0]} (${sorted[1][1]} but(s)).` : ''}`;
                }
                return "Je n'ai pas trouvé de buteurs pour ce match.";
            }
            
            if (q.includes('gardien') || q.includes('arrêt')) {
                const arrets = advData.filter(r => r[COLS.resultat] === 'Tir raté').length;
                const tirsSubis = advButs + arrets;
                const pct = tirsSubis > 0 ? Math.round(arrets / tirsSubis * 100) : 0;
                return `Le gardien a réalisé ${arrets} arrêt(s) sur ${tirsSubis} tirs cadrés, soit <strong>${pct}%</strong> d'efficacité.`;
            }
            
            if (q.includes('perte') || q.includes('pb')) {
                return `FENIX a commis <strong>${fenixPB} perte(s) de balle</strong> sur ce match. ${fenixPB > 6 ? "C'est beaucoup, ça a probablement coûté des occasions." : "C'est correct."}`;
            }
            
            if (q.includes('score') || q.includes('résultat')) {
                return `Score final : <strong>FENIX ${fenixButs} - ${advButs} Adversaire</strong>. ${fenixButs > advButs ? 'Victoire ! 🎉' : fenixButs < advButs ? 'Défaite.' : 'Match nul.'}`;
            }
            
            // Réponse par défaut avec suggestions
            return `Pour ce match (${matchName}), voici les stats clés : Score ${fenixButs}-${advButs}, Efficacité ${fenixEff}%, ${fenixPB} pertes de balle.<br><br><strong>Tu peux me demander :</strong><br>• "Enclenchements" - comment on a marqué<br>• "Supériorités" - bilan des + et -<br>• "Meilleur buteur"<br>• "Gardien"`;
        }
