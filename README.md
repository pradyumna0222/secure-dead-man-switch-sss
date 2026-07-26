
# 🔐 Secure Dead Man's Switch using Shamir Secret Sharing

A secure implementation of a **Dead Man's Switch (DMS)** using **Shamir's Secret Sharing (SSS)**. This project ensures that confidential information can only be reconstructed when a predefined threshold of authorized participants collaborates.

---

## 📌 Overview

Traditional Dead Man's Switch systems rely on a single trusted entity, creating a single point of failure.

This project addresses that limitation by integrating **Shamir's Secret Sharing**, allowing a secret to be divided into multiple shares. The original secret can only be reconstructed when at least **k** out of **n** participants provide their valid shares.

---

## ✨ Features

- Threshold-based secret sharing
- Shamir's Secret Sharing implementation in C++
- Web-based interface using HTML, CSS, and JavaScript
- Secret reconstruction using valid shares
- Educational demonstration of threshold cryptography
- Simple and user-friendly interface

---

## 🛠️ Tech Stack

### Programming
- C++

### Frontend
- HTML
- CSS
- JavaScript

### Cryptography
- Shamir's Secret Sharing (SSS)
- Polynomial-based Secret Generation
- Lagrange Interpolation

---

## 📂 Repository Structure

```
secure-dead-man-switch-sss/
│
├── archive/
├── cpp/
├── docs/
├── images/
├── screenshots/
└── web/
```

---

## 📁 Folder Description

### archive/
Original project archive.

### cpp/
C++ implementation of the secret sharing algorithm.

### docs/
Project documentation and presentation slides.

### images/
Architecture diagrams and workflow illustrations.

### screenshots/
Application screenshots.

### web/
Frontend implementation using HTML, CSS, and JavaScript.

---

## 🚀 How to Run

### C++ Version

Compile the source code:

```bash
g++ death_man_switch_code.cpp -o dms
```

Run:

```bash
./dms
```

---

### Web Version

Open the HTML files in your browser.

Example:

```
home_page.html
```

---

## 🔐 Algorithm Workflow

1. Enter the secret.
2. Choose the total number of shares.
3. Choose the threshold value.
4. Generate shares using Shamir's Secret Sharing.
5. Distribute shares securely.
6. Collect the required threshold shares.
7. Reconstruct the original secret.

---

## 📸 Screenshots

Screenshots of the application are available in the `screenshots/` directory.

---

## 📚 Documentation

Project presentations are available in the `docs/` folder.

---

## 🎯 Future Improvements

- Secure share storage
- User authentication
- Database integration
- Cloud deployment
- Encrypted share transmission
- Multi-user support


---

## 📄 License

This project is licensed under the MIT License.
