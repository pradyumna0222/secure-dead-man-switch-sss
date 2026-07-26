document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const primeInput = document.getElementById('prime');
    const sharesCountInput = document.getElementById('sharesCount');
    const updateSharesBtn = document.getElementById('updateSharesBtn');
    const sharesInputsContainer = document.getElementById('sharesInputs');
    const reconstructBtn = document.getElementById('reconstructBtn');
    const clearBtn = document.getElementById('clearBtn');
    const homeButton = document.getElementById('homeButton');
    const backButton = document.getElementById('backButton');
    const resultDiv = document.getElementById('result');

    // Initialize shares inputs
    updateSharesInputs();
    
    // Event listeners
    updateSharesBtn.addEventListener('click', updateSharesInputs);
    reconstructBtn.addEventListener('click', reconstructSecret);
    clearBtn.addEventListener('click', clearAll);
    homeButton.addEventListener('click', goHome);
    backButton.addEventListener('click', goHome);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            reconstructSecret();
        }
    });

    // Functions
    function updateSharesInputs() {
        const count = parseInt(sharesCountInput.value) || 3;
        sharesInputsContainer.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const shareDiv = document.createElement('div');
            shareDiv.className = 'share-input';
            
            const label = document.createElement('label');
            label.textContent = `Share ${i + 1}:`;
            label.htmlFor = `shareX${i}`;
            
            const xInput = document.createElement('input');
            xInput.type = 'number';
            xInput.placeholder = 'x value';
            xInput.id = `shareX${i}`;
            
            const yInput = document.createElement('input');
            yInput.type = 'number';
            yInput.placeholder = 'y value';
            yInput.id = `shareY${i}`;
            
            shareDiv.appendChild(label);
            shareDiv.appendChild(xInput);
            shareDiv.appendChild(yInput);
            
            sharesInputsContainer.appendChild(shareDiv);
        }
    }
    
    function reconstructSecret() {
        // Get prime number
        const p = parseInt(primeInput.value);
        if (!p || !isPrime(p)) {
            showResult('Please enter a valid prime number', 'error');
            return;
        }
        
        // Get shares
        const sharesCount = parseInt(sharesCountInput.value) || 3;
        const shares = [];
        
        for (let i = 0; i < sharesCount; i++) {
            const x = parseInt(document.getElementById(`shareX${i}`).value);
            const y = parseInt(document.getElementById(`shareY${i}`).value);
            
            if (isNaN(x) || isNaN(y)) {
                showResult(`Please fill all share values (Share ${i + 1})`, 'error');
                return;
            }
            
            shares.push({ x, y });
        }
        
        // Check for duplicate x values
        const xValues = shares.map(share => share.x);
        if (new Set(xValues).size !== xValues.length) {
            showResult('All x values must be unique', 'error');
            return;
        }
        
        // Reconstruct secret
        try {
            const secret = lagrangeInterpolation(shares, p);
            showResult(`The reconstructed secret is: <strong>${secret}</strong>`, 'success');
        } catch (error) {
            showResult(`Error during reconstruction: ${error.message}`, 'error');
        }
    }
    
    function lagrangeInterpolation(shares, p) {
        let secret = 0;
        const n = shares.length;
        
        for (let j = 0; j < n; j++) {
            const xj = shares[j].x;
            const yj = shares[j].y;
            
            let lambda = 1;
            
            for (let m = 0; m < n; m++) {
                if (m !== j) {
                    const xm = shares[m].x;
                    let num = xm;
                    let den = xm - xj;
                    
                    if (den < 0) {
                        den += p;
                    }
                    
                    const inv = modInverse(den, p);
                    if (inv === -1) {
                        throw new Error('Modular inverse does not exist');
                    }
                    
                    lambda = (lambda * num) % p;
                    lambda = (lambda * inv) % p;
                }
            }
            
            secret = (secret + (yj * lambda) % p) % p;
        }
        
        if (secret < 0) {
            secret += p;
        }
        
        return secret;
    }
    
    function modInverse(a, p) {
        a = ((a % p) + p) % p;
        for (let x = 1; x < p; x++) {
            if ((a * x) % p === 1) {
                return x;
            }
        }
        return -1;
    }
    
    function isPrime(num) {
        if (num <= 1) return false;
        if (num <= 3) return true;
        if (num % 2 === 0 || num % 3 === 0) return false;
        
        for (let i = 5; i * i <= num; i += 6) {
            if (num % i === 0 || num % (i + 2) === 0) return false;
        }
        
        return true;
    }
    
    function showResult(message, type = 'info') {
        resultDiv.innerHTML = message;
        resultDiv.className = `result ${type}`;
    }
    
    function clearAll() {
        primeInput.value = '';
        sharesCountInput.value = '3';
        updateSharesInputs();
        showResult('', 'info');
    }
    
    function goHome() {
        window.location.href = 'home_page.html';
    }
});