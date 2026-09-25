using System;
using System.Drawing;

class TestWhatIsInside {
    static void Main() {
        string[] files = new string[] {
            "zorp_climb_idle_0.png",
            "zorp_climb_idle_1.png",
            "zorp_climb_up_0.png",
            "zorp_climb_up_1.png",
            "zorp_climb_up_2.png",
            "zorp_climb_up_3.png",
            "zorp_climb_reach_left.png",
            "zorp_climb_reach_right.png",
            "zorp_climb_jump_up.png",
            "zorp_climb_jump_left.png",
            "zorp_climb_jump_right.png"
        };

        foreach (var f in files) {
            Bitmap b = new Bitmap(f);
            Console.WriteLine("=== " + f + " (" + b.Width + "x" + b.Height + ") ===");
            // Check pixel colors at the bottom 30 rows
            int bottomY = b.Height - 25;
            for (int y = bottomY; y < b.Height; y += 3) {
                string row = "";
                for (int x = 0; x < b.Width; x += 2) {
                    Color c = b.GetPixel(x, y);
                    if (c.A < 30) row += " ";
                    else if (c.B > 150 && c.B > c.R * 1.3) row += "B"; // Blue
                    else if (c.G > 120 && c.G > c.R * 1.2) row += "G"; // Green
                    else row += "*";
                }
                if (row.Trim().Length > 0) Console.WriteLine(row);
            }
            b.Dispose();
        }
    }
}
