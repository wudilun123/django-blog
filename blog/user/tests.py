import re

from django.test import TestCase

# Create your tests here.
blank_str_regexp = re.compile("\s*$")

# print(''==True)
# print(''==False)
# print(''==0)
# print(0==False)
# print(bool('')==False)
# print(bool('   '))
# print(' '.isspace())
# print(bool(blank_str_regexp.match('  \n')))
t='1'
s='10'
print(int(t)-1)
print(int(t)*int(s))
print(0*10)