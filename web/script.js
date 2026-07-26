// app.js — improved with accessibility, validation, toasts, modal confirm, undo, keyboard shortcuts
// Primary logic (modular arithmetic and Shamir) reused and extended with UI rules

/* -------------------------
   Utilities & arithmetic
   ------------------------- */
const $ = id => document.getElementById(id);
const toBigInt = v => {
  if (typeof v === 'bigint') return v;
  v = (v ?? '').toString().trim();
  if (v === '') throw new Error('Empty number');
  if (v.startsWith('+')) v = v.slice(1);
  // allow digits only (prevent alphabetic characters)
  if (!/^-?\d+$/.test(v)) throw new Error('Only integer digits allowed');
  return BigInt(v);
};
const mod = (a, p) => ((a % p) + p) % p;

function egcd(a, b) {
  let old_r = a, r = b;
  let old_s = 1n, s = 0n;
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return { g: old_r, x: old_s };
}

function modInverse(a, m) {
  a = mod(a, m);
  const { g, x } = egcd(a < 0n ? a + m : a, m);
  if (g !== 1n) throw new Error('No modular inverse exists');
  return mod(x, m);
}
function evalPoly(coeffs, x, p){
  let res = 0n; let power = 1n;
  for (const c of coeffs) { res = mod(res + mod(c * power, p), p); power = mod(power * x, p); }
  return res;
}

// --- Added Primality Test Utilities ---
function power(a, d, n) {
  let res = 1n;
  a = a % n;
  while (d > 0n) {
    if (d & 1n) res = (res * a) % n;
    d = d >> 1n;
    a = (a * a) % n;
  }
  return res;
}

function millerRabin(n, d, s) {
  // Using a set of small, fixed bases for BigInt-based Miller-Rabin
  // These are chosen to provide good certainty for numbers up to ~3.3 x 10^24
  // If n is larger, more or different bases may be needed.
  const bases = [2n, 3n, 5n, 7n, 11n, 13n];

  for (let a of bases) {
    if (a >= n) break; // Base must be < n

    let x = power(a, d, n);

    if (x === 1n || x === n - 1n) continue;

    let isComposite = true;
    for (let r = 1n; r < s; r++) {
      x = (x * x) % n;
      if (x === n - 1n) {
        isComposite = false;
        break;
      }
    }

    if (isComposite) return false; // n is definitely composite
  }

  return true; // n is likely prime
}

/**
 * Probabilistic primality test for BigInt.
 * @param {bigint} n - The number to test.
 * @returns {boolean} - True if likely prime, false if composite.
 */
function isPrime(n) {
  if (n <= 1n) return false;
  if (n <= 3n) return true;
  if (n % 2n === 0n || n % 3n === 0n) return false;

  // Miller-Rabin pre-check: n - 1 = d * 2^s
  let d = n - 1n;
  let s = 0n;
  while (d % 2n === 0n) {
    d /= 2n;
    s++;
  }

  return millerRabin(n, d, s);
}
// --- End Primality Test Utilities ---

/* -------------------------
   DOM refs
   ------------------------- */
const secretInput = $('secret');
const sharesCountInput = $('sharesCount');
const thresholdInput = $('threshold');
const primeInput = $('prime');
const coeffInputsDiv = $('coeffInputs');
const renderCoeffsBtn = $('renderCoeffs');
const generateBtn = $('generateShares');
const clearAllBtn = $('clearAll');
const sharesArea = $('sharesArea');
const messageDiv = $('message');
const needTSpan = $('needT');
const reconstructBtn = $('reconstruct');
const autoSelectBtn = $('autoSelect');
const deselectAllBtn = $('deselectAll');
const reconResultDiv = $('reconResult');
const toast = $('toast');

const confirmModal = $('confirmModal');
const confirmYes = $('confirmYes');
const confirmNo = $('confirmNo');

/* -------------------------
   State & helper UI
   ------------------------- */
let currentShares = [];
let currentT = 0;
let lastState = null; // for undo
let undoTimer = null;

function showToast(text, timeout=3500){
  toast.textContent = text; toast.classList.add('show');
  setTimeout(()=>{ toast.classList.remove('show'); }, timeout);
}
function showMessage(msg,color){ messageDiv.textContent = msg; messageDiv.style.color = color || ''; }
function clearMessage(){ messageDiv.textContent = ''; }

/* -------------------------
   Input helpers & validation
   ------------------------- */
function renderCoeffInputs(){
  coeffInputsDiv.innerHTML = '';
  
  let t = parseInt(thresholdInput.value) || 0; 
  let r = parseInt(sharesCountInput.value) || 0; // Get r
  
  if (t < 1) t = 1;
  needTSpan.textContent = thresholdInput.value || 't';

  // NEW: If threshold is greater than shares count, show an error and stop rendering.
  if (t > r && r > 0) {
    coeffInputsDiv.innerHTML = `<p style="color:red;">Error: Threshold (t=${t}) cannot be greater than the Number of shares (r=${r}). Please correct the parameters.</p>`;
    return;
  }

  for (let i = 0; i < t; i++){
    const wrap = document.createElement('div'); wrap.className = 'coeff-input';
    const label = document.createElement('label'); label.textContent = `coeff[${i}]`;
    const input = document.createElement('input'); input.type='text'; input.id = `coeff-${i}`;
    input.placeholder = i===0 ? 'secret (auto)' : `coefficient for x^${i}`;
    if (i===0) input.disabled = true;
    // Preserve previous value if available
    const prevInput = $(`coeff-${i}`);
    if (prevInput) input.value = prevInput.value;
    label.appendChild(input); wrap.appendChild(label); coeffInputsDiv.appendChild(wrap);
  }
  const s = secretInput.value.trim(); if (s !== '') { const c0 = $('coeff-0'); if (c0) c0.value = s; }
}

renderCoeffsBtn.addEventListener('click', ()=>{ renderCoeffInputs(); showToast('Coefficient inputs rendered'); });

// NEW: Call renderCoeffInputs when r changes too, as it's needed for t > r validation
thresholdInput.addEventListener('change', ()=> renderCoeffInputs());
sharesCountInput.addEventListener('change', ()=> renderCoeffInputs());

secretInput.addEventListener('input', ()=> { const c0 = $('coeff-0'); if (c0) c0.value = secretInput.value; });

function gatherCoeffs(){
  const t = parseInt(thresholdInput.value);
  const coeffs = [];
  let missingNonSecretCoeff = false;

  for (let i=0;i<t;i++){
    const el = $(`coeff-${i}`); if (!el) throw new Error('Coefficient input missing');
    let v = el.value.trim();

    if (i===0 && v==='') throw new Error('Secret is required');
    
    if (i > 0 && v === '') {
      // If non-secret coeff is empty, use '0' for the math but flag it as missing for validation
      missingNonSecretCoeff = true;
      v = '0';
    } else if (i === 0 && v === '') {
      throw new Error('Secret is required');
    }

    coeffs.push(toBigInt(v));
  }

  return {coeffs, missingNonSecretCoeff};
}

/* -------------------------
   Generate shares (with feedback + prevention)
   ------------------------- */
function generateShares(){
  try {
    clearMessage(); reconResultDiv.textContent = '';
    const secret = toBigInt(secretInput.value);
    const r = parseInt(sharesCountInput.value);
    const t = parseInt(thresholdInput.value);
    const p = toBigInt(primeInput.value);

    if (secret<=0){showMessage('Secrets must be positive','orange');return;}
    if (r <= 0) { showMessage('Number of shares must be > 0','orange'); return; }
    if (t <= 0 || t > r) { showMessage('Threshold invalid (1 ≤ t ≤ r)','orange'); return; }
    if (p <= secret) { showMessage('Prime p must be > secret','orange'); return; }

    // Primality check for p
    if (!isPrime(p)) {
      showMessage('Error: Modulus p must be a prime number. Please enter a prime value for p.','red');
      return;
    }
    

    // gather coefficients & enforce coeff[0] = secret
    const {coeffs, missingNonSecretCoeff} = gatherCoeffs();
    coeffs[0] = secret; // Enforce f(0) = secret

    // Check for unentered non-secret coefficients
    if (t > 1 && missingNonSecretCoeff) {
      showMessage('Error: You must enter all required coefficients for x¹ to xᵗ⁻¹. Empty coefficients will default to 0, but are required for proper security.','red');
      return;
    }
    

    // save state for undo (rule: permit easy reversal)
    lastState = {
      secret: secretInput.value, sharesCount: sharesCountInput.value, threshold: thresholdInput.value,
      prime: primeInput.value, coeffsHTML: coeffInputsDiv.innerHTML, currentShares: [...currentShares]
    };

    currentT = t; needTSpan.textContent = t;

    // show progress indicator (small)
    showMessage('Generating shares…', 'var(--muted)');
    generateBtn.disabled = true;
    setTimeout(()=>{ // emulate progress so user perceives feedback (rule: informative feedback)
      const shares = [];
      for (let x=1; x<=r; x++){
        const bx = BigInt(x);
        const y = evalPoly(coeffs, bx, p);
        shares.push({x:bx, y:y});
      }
      currentShares = shares;
      renderSharesTable();
      showToast(`Generated ${shares.length} shares`);
      generateBtn.disabled = false;
      clearMessage();
    }, 180); // tiny delay to allow UI update
  } catch (err){
    showMessage('Error: ' + (err.message || err), 'red');
  }
}

/* -------------------------
   Shares rendering + selection helpers
   ------------------------- */
function renderSharesTable(){
  sharesArea.innerHTML = '';
  if (!currentShares.length){ sharesArea.innerHTML = '<p class="hint">No shares generated yet.</p>'; return; }
  const table = document.createElement('table');
  table.innerHTML = `<thead><tr><th>#</th><th>Share (x, y)</th><th>Pick</th><th>Actions</th></tr></thead>`;
  const tbody = document.createElement('tbody');

  currentShares.forEach((s, idx) => {
    const tr = document.createElement('tr');
    const tdIdx = document.createElement('td'); tdIdx.textContent = idx+1;
    const tdShare = document.createElement('td'); tdShare.textContent = `(${s.x.toString()}, ${s.y.toString()})`;
    const tdPick = document.createElement('td'); const cb = document.createElement('input');
    cb.type='checkbox'; cb.dataset.index = idx; cb.className='share-checkbox'; cb.addEventListener('change', updateSelectedSummary);
    tdPick.appendChild(cb);
    const tdAct = document.createElement('td'); const copyBtn = document.createElement('button');
    copyBtn.className='copy-btn secondary'; copyBtn.textContent='Copy'; copyBtn.addEventListener('click', ()=>{
      navigator.clipboard?.writeText(`(${s.x.toString()}, ${s.y.toString()})`);
      showToast('Share copied to clipboard');
    });
    tdAct.appendChild(copyBtn);

    tr.appendChild(tdIdx); tr.appendChild(tdShare); tr.appendChild(tdPick); tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  sharesArea.appendChild(table);

  const info = document.createElement('div'); info.className='hint'; info.textContent = `Generated ${currentShares.length} shares. Select exactly ${currentT} shares to reconstruct.`;
  sharesArea.appendChild(info);
  updateSelectedSummary();
}

function updateSelectedSummary(){
  const checkboxes = sharesArea.querySelectorAll('input.share-checkbox');
  const selected = [];
  checkboxes.forEach(cb=>{ if (cb.checked) selected.push(currentShares[parseInt(cb.dataset.index)])});
  // show how many selected and their x-values (reduces memory load)
  let summary = document.getElementById('selectedSummary');
  if (!summary){
    summary = document.createElement('div'); summary.id='selectedSummary'; summary.className='hint'; sharesArea.appendChild(summary);
  }
  summary.textContent = `Selected ${selected.length}/${currentT} shares — x: ${selected.map(s=>s.x.toString()).join(', ') || '—'}`;
}

/* -------------------------
   Reconstruction with Lagrange at x=0 (f(0))
   ------------------------- */
function reconstructSecret(){
  try {
    if (!currentShares.length) { showMessage('No shares available. Generate first.','orange'); return; }
    const p = toBigInt(primeInput.value);
    const checkboxes = sharesArea.querySelectorAll('input.share-checkbox');
    const selected = [];
    checkboxes.forEach(cb=>{ if (cb.checked) selected.push(currentShares[parseInt(cb.dataset.index)])});
    if (selected.length !== currentT){ showMessage(`Select exactly ${currentT} shares (selected ${selected.length})`,'orange'); return; }

    showMessage('Reconstructing…','var(--muted)');
    setTimeout(()=>{
      let secret = 0n;
      for (let j=0;j<selected.length;j++){
        const xj = selected[j].x; const yj = selected[j].y;
        let lj = 1n;
        for (let m=0;m<selected.length;m++){
          if (m===j) continue;
          const xm = selected[m].x;
          const numerator = mod(xm, p);
          const denominator = mod(xm - xj, p);
          const inv = modInverse(denominator, p);
          lj = mod(lj * numerator, p);
          lj = mod(lj * inv, p);
        }
        secret = mod(secret + mod(yj * lj, p), p);
      }
      reconResultDiv.innerHTML = `<div>Reconstructed secret: <strong>${secret.toString()}</strong>
        <button id="copyRecon" class="secondary" style="margin-left:10px">Copy</button></div>`;
      $('copyRecon').addEventListener('click', ()=>{ navigator.clipboard?.writeText(secret.toString()); showToast('Secret copied'); });
      clearMessage();
      showToast('Reconstruction complete');
    },120);
  } catch (err){
    showMessage('Error: ' + (err.message || err), 'red');
  }
}

/* -------------------------
   Auto-select, deselect, undo, clear with confirmation modal
   ------------------------- */
function autoSelectFirstT(){
  const cbxs = sharesArea.querySelectorAll('input.share-checkbox'); let sel=0;
  for (const cb of cbxs){ if (sel < currentT){ cb.checked = true; sel++; } else cb.checked = false; }
  updateSelectedSummary(); showToast('Auto-selected first t shares');
}
function deselectAll(){ const cbxs = sharesArea.querySelectorAll('input.share-checkbox'); cbxs.forEach(c=>c.checked=false); updateSelectedSummary(); }

clearAllBtn.addEventListener('click', ()=> openConfirmModal());
function openConfirmModal(){
  confirmModal.setAttribute('aria-hidden','false'); confirmModal.style.display='flex';
  confirmModal.querySelector('.modal-content').focus();
}
confirmNo.addEventListener('click', closeConfirmModal);
function closeConfirmModal(){ confirmModal.setAttribute('aria-hidden','true'); confirmModal.style.display='none'; }

confirmYes.addEventListener('click', ()=>{
  // perform clear but keep lastState for undo
  lastState = {
    secret: secretInput.value, sharesCount: sharesCountInput.value, threshold: thresholdInput.value,
    prime: primeInput.value, coeffsHTML: coeffInputsDiv.innerHTML, currentShares: [...currentShares]
  };
  secretInput.value=''; sharesCountInput.value=5; thresholdInput.value=3; primeInput.value=''; coeffInputsDiv.innerHTML=''; sharesArea.innerHTML='<p class="hint">No shares generated yet.</p>'; reconResultDiv.textContent=''; currentShares=[]; currentT=0; needTSpan.textContent='t'; closeConfirmModal();
  showToast('Cleared — Undo available for 8s');
  // start undo timer
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(()=>{ lastState = null; showToast('Undo expired'); }, 8000);
  // Offer inline undo message
  messageDiv.innerHTML = '<button id="undoBtn" class="secondary">Undo</button>';
  document.getElementById('undoBtn').addEventListener('click', ()=>{ undoClear(); });
});

function undoClear(){
  if (!lastState) { showMessage('Nothing to undo','orange'); return; }
  secretInput.value = lastState.secret; sharesCountInput.value = lastState.sharesCount; thresholdInput.value = lastState.threshold; primeInput.value = lastState.prime;
  coeffInputsDiv.innerHTML = lastState.coeffsHTML;
  currentShares = lastState.currentShares || [];
  if (currentShares.length) renderSharesTable(); lastState = null; if (undoTimer) clearTimeout(undoTimer);
  showToast('Undo successful');
  clearMessage();
}

/* -------------------------
   Keyboard shortcuts — power users (seek universal usability)
   Ctrl+G generate, Ctrl+R reconstruct
   ------------------------- */
document.addEventListener('keydown', (e)=>{
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g'){ e.preventDefault(); generateShares(); }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r'){ e.preventDefault(); reconstructSecret(); }
});

/* -------------------------
   Attach events
   ------------------------- */
generateBtn.addEventListener('click', generateShares);
reconstructBtn.addEventListener('click', reconstructSecret);
autoSelectBtn.addEventListener('click', autoSelectFirstT);
deselectAllBtn.addEventListener('click', deselectAll);

renderCoeffInputs(); // initial

// Accessibility: close modal on Escape
document.addEventListener('keydown',(e)=>{ if (e.key === 'Escape' && confirmModal.getAttribute('aria-hidden')==='false') closeConfirmModal(); });