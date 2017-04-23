package backend;

import org.apfloat.Apfloat;
import org.apfloat.ApfloatMath;
import org.apfloat.Apint;

public class verify_bits {
	
	public static void main(String[] args) {
		// Get numbers from args
	    
	    if (args[0].equals("check") == true)
		{
		    check_bits(args[1]);
		}
	    else
		{
		    String[] nums_to_check = new String[args.length - 2];
		    for (int i = 2; i < args.length; i ++)
			{
			    nums_to_check[i-2] =  args[i];
			}
		
		    // args[1] is the number to check against
		    // nums to check holds the numbers you multiply together
		    // to see if they equal the number at args[1]
		    check_factors(args[1],nums_to_check);
		   
		    
		}	
	    return;
	}
	public static void check_bits (String num) {
		Apfloat test_num = new Apfloat(num);
		Apfloat base = new Apfloat(2);
		
		Apfloat log_num = ApfloatMath.log(test_num,base);
		
		Apint floor_log = ApfloatMath.floor(log_num);
		Apint one = new Apint(1);
		floor_log = floor_log.add(one);
		int num_bits = floor_log.intValue();
		if ((num_bits < 80) || (num_bits > 240))
		    {
			System.out.println('0');
		    }
		else
		    {
			System.out.println('1');
		    }
		
	}
	public static void check_factors(String check_num, String[] numbers)
	{
	
		Apint num_check = new Apint(check_num);
		
		Apint answer = new Apint(numbers[0]);
		for (int i = 1; i < numbers.length; i ++)
		    {
			Apint fac2 = new Apint(numbers[i]);
			answer = answer.multiply(fac2);
		    }
		if (answer.equals(num_check))
		{
		    System.out.println('1');
		}
		else
		{
		    System.out.println('0');
		}
	}
}
