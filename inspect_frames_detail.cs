using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

class SpriteFrameInspector {
    static void Main() {
        Bitmap bmp = new Bitmap("zorp_escalada_clean.png");
        Console.WriteLine("Master clean image: " + bmp.Width + "x" + bmp.Height);

        // Let's create an HTML breakdown with high resolution and labels
        // We will slice the image by its actual visual regions
        // Let's scan for rows and individual bounding boxes
        // Row 1 (Idle / Wall climbing): Y around 30..190
        // Row 2 (Climbing / Movement): Y around 240..450
        // Row 3 (Jumping / Actions): Y around 500..720
        // Row 4 (Victory / Hits / Effects / Stones): Y around 770..980

        // Let's dump all non-empty regions with their Y and X coordinates
        int[] rowCount = new int[bmp.Height];
        for (int y = 0; y < bmp.Height; y++) {
            for (int x = 0; x < bmp.Width; x++) {
                if (bmp.GetPixel(x, y).A > 30) rowCount[y]++;
            }
        }

        // Let's find distinct rows
        for (int y = 0; y < bmp.Height; y++) {
            if (rowCount[y] > 50) {
                int startY = y;
                while (y < bmp.Height && rowCount[y] > 20) y++;
                int endY = y;
                Console.WriteLine("Row: Y=" + startY + ".." + endY + " (H=" + (endY - startY) + ")");

                // Find sprites in this row
                int[] colCount = new int[bmp.Width];
                for (int x = 0; x < bmp.Width; x++) {
                    for (int cy = startY; cy < endY; cy++) {
                        if (bmp.GetPixel(x, cy).A > 30) colCount[x]++;
                    }
                }

                for (int x = 0; x < bmp.Width; x++) {
                    if (colCount[x] > 5) {
                        int startX = x;
                        while (x < bmp.Width && colCount[x] > 5) x++;
                        int endX = x;
                        
                        // Find tight box
                        int minX = endX, maxX = startX, minY = endY, maxY = startY;
                        for (int cy = startY; cy < endY; cy++) {
                            for (int cx = startX; cx < endX; cx++) {
                                if (bmp.GetPixel(cx, cy).A > 30) {
                                    if (cx < minX) minX = cx;
                                    if (cx > maxX) maxX = cx;
                                    if (cy < minY) minY = cy;
                                    if (cy > maxY) maxY = cy;
                                }
                            }
                        }

                        if (maxX >= minX && maxY >= minY && (maxX - minX > 15) && (maxY - minY > 15)) {
                            Console.WriteLine(String.Format("  Sprite: X={0}..{1} (W={2}), Y={3}..{4} (H={5})", minX, maxX, maxX - minX + 1, minY, maxY, maxY - minY + 1));
                        }
                    }
                }
            }
        }
    }
}
