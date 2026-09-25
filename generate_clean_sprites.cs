using System;
using System.Drawing;
using System.Drawing.Imaging;

class CleanSpriteAndGripGenerator {
    static void Main() {
        Bitmap master = new Bitmap("zorp_escalada_clean.png");

        // Helper to crop tight rectangle from master
        Action<string, Rectangle> cropAndSave = (filename, rect) => {
            // Find tight non-empty bounds within rect
            int minX = rect.Right, maxX = rect.Left, minY = rect.Bottom, maxY = rect.Top;
            for (int y = rect.Top; y < rect.Bottom; y++) {
                for (int x = rect.Left; x < rect.Right; x++) {
                    if (x >= 0 && x < master.Width && y >= 0 && y < master.Height) {
                        if (master.GetPixel(x, y).A > 30) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
            }

            if (maxX >= minX && maxY >= minY) {
                int w = maxX - minX + 1;
                int h = maxY - minY + 1;
                Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb);
                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < w; x++) {
                        bmp.SetPixel(x, y, master.GetPixel(minX + x, minY + y));
                    }
                }
                bmp.Save(filename, ImageFormat.Png);
                Console.WriteLine("Saved " + filename + " (" + w + "x" + h + ")");
                bmp.Dispose();
            } else {
                Console.WriteLine("Warning: empty rect for " + filename);
            }
        };

        // 1. Zorp Climbing Animations (Clean feet, no ice block)
        cropAndSave("zorp_climb_idle_0.png", new Rectangle(30, 63, 68, 127));
        cropAndSave("zorp_climb_idle_1.png", new Rectangle(135, 64, 68, 126));
        cropAndSave("zorp_climb_up_0.png", new Rectangle(354, 65, 64, 125));
        cropAndSave("zorp_climb_up_1.png", new Rectangle(434, 65, 63, 125));
        cropAndSave("zorp_climb_up_2.png", new Rectangle(511, 64, 65, 125));
        cropAndSave("zorp_climb_up_3.png", new Rectangle(752, 63, 64, 124));
        cropAndSave("zorp_climb_reach_left.png", new Rectangle(1056, 66, 52, 120));
        cropAndSave("zorp_climb_reach_right.png", new Rectangle(1116, 66, 51, 124));
        cropAndSave("zorp_climb_jump_up.png", new Rectangle(1174, 66, 52, 124));
        cropAndSave("zorp_climb_jump_left.png", new Rectangle(1270, 93, 75, 100));
        cropAndSave("zorp_climb_jump_right.png", new Rectangle(1384, 90, 75, 102));

        // Hit / Fall / Victory
        cropAndSave("zorp_climb_hit.png", new Rectangle(27, 787, 72, 163));
        cropAndSave("zorp_climb_fall.png", new Rectangle(222, 787, 69, 162));
        cropAndSave("zorp_climb_win_0.png", new Rectangle(323, 792, 78, 165));
        cropAndSave("zorp_climb_win_1.png", new Rectangle(424, 795, 82, 175));

        // Master's thrown projectile & yellow hit spark
        cropAndSave("hazard_stone.png", new Rectangle(1409, 844, 92, 42));
        cropAndSave("hit_spark_yellow.png", new Rectangle(660, 796, 110, 110));

        // 2. High-quality Colorful Climbing Grips (Inspired 100% by Google Doodle Champion Island)
        // Green Climbing Grip (28x20)
        using (Bitmap gBmp = new Bitmap(28, 20, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(gBmp)) {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            // Dark drop shadow
            g.FillEllipse(new SolidBrush(Color.FromArgb(180, 20, 30, 15)), 2, 6, 24, 13);
            // Grip base
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 39, 174, 96)), 3, 2, 22, 14);
            // Grip inner highlight
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 46, 204, 113)), 5, 3, 18, 10);
            // Specular top edge
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 163, 240, 180)), 7, 4, 10, 4);
            gBmp.Save("grip_green.png", ImageFormat.Png);
            Console.WriteLine("Saved grip_green.png");
        }

        // Purple/Magenta Climbing Grip (28x20)
        using (Bitmap pBmp = new Bitmap(28, 20, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(pBmp)) {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            g.FillEllipse(new SolidBrush(Color.FromArgb(180, 40, 10, 35)), 2, 6, 24, 13);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 142, 68, 173)), 3, 2, 22, 14);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 190, 46, 150)), 5, 3, 18, 10);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 245, 160, 220)), 7, 4, 10, 4);
            pBmp.Save("grip_purple.png", ImageFormat.Png);
            Console.WriteLine("Saved grip_purple.png");
        }

        // Blue Moving Grip (36x20) - Oval slider with crystal core
        using (Bitmap bBmp = new Bitmap(36, 20, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(bBmp)) {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            g.FillEllipse(new SolidBrush(Color.FromArgb(180, 10, 35, 60)), 2, 6, 32, 13);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 41, 128, 185)), 3, 2, 30, 14);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 52, 152, 219)), 6, 3, 24, 10);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 129, 236, 236)), 9, 4, 18, 5);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 255, 255, 255)), 12, 5, 8, 3);
            bBmp.Save("grip_blue.png", ImageFormat.Png);
            Console.WriteLine("Saved grip_blue.png");
        }

        // Red/Orange Brittle Grip (28x20) - With visible crack lines
        using (Bitmap rBmp = new Bitmap(28, 20, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(rBmp)) {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            g.FillEllipse(new SolidBrush(Color.FromArgb(180, 50, 15, 10)), 2, 6, 24, 13);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 192, 57, 43)), 3, 2, 22, 14);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 230, 76, 60)), 5, 3, 18, 10);
            g.FillEllipse(new SolidBrush(Color.FromArgb(255, 243, 156, 18)), 7, 4, 10, 4);
            // Black cracks
            using (Pen crackPen = new Pen(Color.FromArgb(255, 44, 10, 10), 1.5f)) {
                g.DrawLine(crackPen, 10, 4, 14, 10);
                g.DrawLine(crackPen, 14, 10, 18, 8);
                g.DrawLine(crackPen, 14, 10, 12, 15);
            }
            rBmp.Save("grip_red.png", ImageFormat.Png);
            Console.WriteLine("Saved grip_red.png");
        }

        // Shrine / Lantern Checkpoint (40x48) - Traditional Japanese mountain shrine as in Doodle Island
        using (Bitmap sBmp = new Bitmap(40, 48, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(sBmp)) {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            // Stone base
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 87, 101, 116)), 12, 34, 16, 12);
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 131, 149, 167)), 14, 34, 12, 3);
            // Lantern pillar
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 53, 59, 72)), 16, 22, 8, 12);
            // Lantern chamber (glowing yellow/orange)
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 241, 196, 15)), 13, 13, 14, 10);
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 255, 250, 101)), 15, 15, 10, 6);
            // Wooden roof / Pagoda eaves
            g.FillPolygon(new SolidBrush(Color.FromArgb(255, 30, 81, 70)), new Point[] {
                new Point(4, 13), new Point(20, 2), new Point(36, 13), new Point(32, 13), new Point(20, 5), new Point(8, 13)
            });
            g.FillPolygon(new SolidBrush(Color.FromArgb(255, 46, 117, 89)), new Point[] {
                new Point(6, 12), new Point(20, 3), new Point(34, 12)
            });
            // Top finial
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 218, 165, 32)), 18, 0, 4, 4);
            sBmp.Save("shrine_checkpoint.png", ImageFormat.Png);
            Console.WriteLine("Saved shrine_checkpoint.png");
        }

        // Grassy Checkpoint Platform (72x40) - Grass ledge where player rests
        using (Bitmap lBmp = new Bitmap(72, 40, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(lBmp)) {
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.None;
            // Rocky ledge base
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 87, 55, 37)), 4, 18, 64, 20);
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 59, 36, 23)), 4, 30, 64, 8);
            // Grass turf
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 106, 158, 77)), 2, 4, 68, 16);
            g.FillRectangle(new SolidBrush(Color.FromArgb(255, 134, 194, 94)), 4, 2, 64, 8);
            // Grass tufts / blades on edge
            for (int i = 0; i < 16; i++) {
                int tx = 4 + i * 4;
                g.FillPolygon(new SolidBrush(Color.FromArgb(255, 164, 224, 114)), new Point[] {
                    new Point(tx, 4), new Point(tx + 2, 0), new Point(tx + 4, 4)
                });
            }
            lBmp.Save("platform_ledge.png", ImageFormat.Png);
            Console.WriteLine("Saved platform_ledge.png");
        }
    }
}
