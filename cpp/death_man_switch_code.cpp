#include <iostream>
#include <vector>
#include <limits>
using namespace std;

class baseclass {
public:
    virtual vector<vector<int>> getshares(int r, int p, vector<int> coeff) = 0;
    virtual void reconstruction(const vector<vector<int>>& shares, int t, int p) = 0;
    virtual ~baseclass() {}
};

void getValidInt(const string& message, int& var) {
    string input;
    while (true) {
        cout << message;
        cin >> input;

        if (input.empty()) { cout << "Enter a valid whole number!" << endl; continue; }

        bool isValid = true;
        for (int i = 0; i < input.size(); i++) {
            if (i == 0 && input[i] == '-') continue;
            if (!isdigit(input[i])) { isValid = false; break; }
        }
        if (!isValid || input == "-" || input.size() > 1 && input[0] == '0') {
            cout << "Enter a valid whole number without leading zeros!" << endl;
            continue;
        }

        try {
            var = stoi(input);
        } catch (...) {
            cout << "Number out of range! Try again." << endl;
            continue;
        }

        break;
    }
}


class SSS : public baseclass {
private:
    int n;
    int prime;
public:
    SSS(int p = 0) { prime = p; cout << "SSS is created" << endl; }
    ~SSS() { cout << "SSS is destroyed" << endl; }
    friend void showPrime(const SSS& obj);
    int inverse(int denominator, int p) {
        for (int x = 1; x < p; x++) {
            if ((denominator * x) % p == 1) return x;
        }
        return -1;
    }
    vector<vector<int>> getshares(int r, int p, vector<int> coeff) override {
        vector<vector<int>> shares;
        cout << "Shares generated:" << endl;
        for (int x = 1; x <= r; x++) {
            int fx = 0, power = 1;
            for (int j = 0; j < coeff.size(); j++) {
                fx = (fx + coeff[j] * power) % p;
                power = (power * x) % p;
            }
            if (fx < 0) fx = (fx + p) % p;
            shares.push_back({x, fx});
            cout << "F(" << x << ") = (" << x << "," << fx << ")" << endl;
        }
        return shares;
    }
    void reconstruction(const vector<vector<int>>& shares, int t, int p) override {
        vector<vector<int>> selectedshares;
        cout << "The threshold is " << t << " Choose the pairs by number:" << endl;
        int sharenum;
        for (int i = 0; i < t; i++) {
            while (true) {
                getValidInt("Enter share number " + to_string(i + 1) + ": ", sharenum);
                if (sharenum < 1 || sharenum > shares.size()) continue;
                bool alreadyChosen = false;
                for (int j = 0; j < selectedshares.size(); j++) {
                    if (selectedshares[j][0] == shares[sharenum - 1][0]) { alreadyChosen = true; break; }
                }
                if (alreadyChosen) continue;
                selectedshares.push_back(shares[sharenum - 1]);
                break;
            }
        }
        cout << "You selected these shares:" << endl;
        for (int i = 0; i < selectedshares.size(); i++)
            cout << "(" << selectedshares[i][0] << "," << selectedshares[i][1] << ")" << endl;
        int secret = 0;
        for (int j = 0; j < selectedshares.size(); j++) {
            int yj = selectedshares[j][1], xj = selectedshares[j][0], lambda = 1;
            for (int m = 0; m < selectedshares.size(); m++) {
                if (m == j) continue;
                int xm = selectedshares[m][0], numerator = xm, denominator = xm - xj;
                if (denominator < 0) denominator += p;
                int inv = inverse(denominator, p);
                lambda = (lambda * numerator) % p;
                lambda = (lambda * inv) % p;
            }
            secret = (secret + (yj * lambda) % p) % p;
        }
        if (secret < 0) secret += p;
        cout << "secret is: " << secret << endl;
    }
};

void showPrime(const SSS& obj) { cout << "the prime is = " << obj.prime << endl; }

int main() {
    int s, r, t, p;
    while (true) { getValidInt("enter the secret key: ", s); 
        if (s > 0) break; 
        cout << "don't enter negative number!!\n"; }
    while (true) { getValidInt("enter the number of shares: ", r);
         if (r > 0) break;
          cout << "don't enter negative number!!\n"; }
    while (true) { getValidInt("enter the threshold which should be less than num of shares: ", t);
         if (t > 0) break; 
         cout << "don't enter negative number!!\n"; }
    while (true) {
        if (t > r) { cout << "the threshold is greater than the number of sharings!!!!!" << endl;
             getValidInt("enter again threshold: ", t);
              continue; }
        if (t == 0) { cout << "the threshold can't be zero!!" << endl;
             getValidInt("enter again threshold: ", t); 
             continue; }
        break;
    }
    while (true) {
        getValidInt("enter the prime num: ", p);
        if (p <= s) { cout << "enter a prime which is greater than secret key!" << endl;
             continue; }
        if (p <= 1) { cout << "Prime number must be greater than 1!" << endl; 
            continue; }
        if (r >= p) { cout << "Number of shares should be LESS than the prime number!" << endl; 
            continue; }
        bool isprime = true;
        for (int i = 2; i * i <= p; i++) { 
            if (p % i == 0) {
                 isprime = false;
                  break; } }
        if (!isprime) { cout << p << " is not a prime number, enter again." << endl; 
            continue; }
        break;
    }
    vector<int> coeff(t); coeff[0] = s;
    for (int i = 1; i < t; i++) 
    getValidInt("enter the coefficient of x^" + to_string(i) + ": ", coeff[i]);
    cout << "polynomial is: ";
    for (int i = 0; i < t; ++i) {
         cout << coeff[i]; 
         if (i > 0) cout << "x^" << i; 
         if (i != t - 1) cout << "+"; }
    cout << endl;
    SSS obj(p);
    vector<vector<int>> shares = obj.getshares(r, p, coeff);
    obj.reconstruction(shares, t, p);
    showPrime(obj);
}