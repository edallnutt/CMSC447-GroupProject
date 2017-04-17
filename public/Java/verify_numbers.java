package backend;

import org.apfloat.Apfloat;
import org.apfloat.ApfloatMath;
import org.apfloat.Apint;

public class verify_bits {
	
	public static void main(String[] args) {
		// Get numbers from args
		int num_of_bits = check_bits("5093509490509348654098354");
		if ((num_of_bits >= 80) && (num_of_bits <= 240))
		{
			System.out.println("Correct Number of Bits");
			// Pass valid Bit to javascript
		}
		else
		{
			System.out.println("Invalid number of bits");	
			// Pass invalid bit to javascript and stop
			return;
		}
		Boolean checking = check_factors("832409","227","3667");
		System.out.println(checking);
		
	}
	public static int check_bits (String num) {
		Apfloat test_num = new Apfloat(num);
		Apfloat base = new Apfloat(2);
		
		Apfloat log_num = ApfloatMath.log(test_num,base);
		
		Apint floor_log = ApfloatMath.floor(log_num);
		Apint one = new Apint(1);
		floor_log = floor_log.add(one);
		return floor_log.intValue();
	}
	public static Boolean check_factors(String check_num, String factor1, String factor2)
	{
		Apint fac1 = new Apint(factor1);
		Apint fac2 = new Apint(factor2);
		Apint num_check = new Apint(check_num);
		if ((fac1.multiply(fac2)).equals(num_check))
		{
			return true;
		}
		else
		{
			return false;
		}
	}
}
