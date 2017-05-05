"""Usage: prime.py <tolerance> <num> [num num num....]
        returns true if all nums are prime, false if at least one is not prime"""

import random
import sys

#Miller-Rabin Primality test
def rabMill(num, reps):
    if num % 2 == 0:
        return False
    
    s = num - 1
    t = 0
    while s % 2 == 0:
        s = s // 2
        t += 1

    for trials in range(reps):
        a = random.randrange(2, num - 1)
        v = pow(a, s, num)
        if v != 1:
            i = 0
            while v != (num - 1):
                if i == t - 1:
                    return False
                else:
                    i = i + 1
                    v = (v ** 2) % num
    return True


#generates bits-bit numbers until it finds one that passes the miller rabin tol times
#for testing
def genPrime(bits, tol):
    n = random.getrandbits(bits)
    if n%2 == 0:
        n += 1
    while(not rabMill(n, tol)):
        n = random.getrandbits(bits)
        if n%2 == 0:
            n += 1
    return n


if(__name__ == '__main__'):
    argc = len(sys.argv)
    argv = sys.argv
    if argc <= 2:
        print "Usage Error:  prime.py <tolerance>  <num1> [num2 num3 .....]"
        print "Requires at least one argument to test for primality"
        sys.exit(1)
    for i in range(2,argc):
        if not rabMill(int(argv[i]),int(argv[1])):
            print False
            sys.exit(0)    
    print True
