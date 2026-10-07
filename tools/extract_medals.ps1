Add-Type -AssemblyName System.Drawing

$sourceCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using System.IO;

public class MedalExtractor {
    public class MedalDef {
        public string Name;
        public int Col;
        public int Row;
        public MedalDef(string name, int col, int row) {
            Name = name;
            Col = col;
            Row = row;
        }
    }

    public static void Run(string basePath) {
        string unlPath = Path.Combine(basePath, "medalhas_desbloqueadas.png");
        string lckPath = Path.Combine(basePath, "medalhas_bloqueadas.png");
        string outDir = Path.Combine(basePath, "medalhas");
        if (!Directory.Exists(outDir)) Directory.CreateDirectory(outDir);

        MedalDef[] medals = new MedalDef[] {
            new MedalDef("ping_pong", 0, 0),
            new MedalDef("basquete", 1, 0),
            new MedalDef("corrida", 2, 0),
            new MedalDef("skate", 3, 0),
            new MedalDef("arco", 0, 1),
            new MedalDef("escalada", 1, 1),
            new MedalDef("boxe", 2, 1),
            new MedalDef("surf", 3, 1)
        };

        int[] colStarts = new int[] { 0, 444, 887, 1331 };
        int[] colEnds = new int[] { 443, 886, 1330, 1773 };
        int[] rowStarts = new int[] { 0, 444 };
        int[] rowEnds = new int[] { 443, 886 };

        using (Bitmap unlBmp = new Bitmap(unlPath))
        using (Bitmap lckBmp = new Bitmap(lckPath)) {
            List<Bitmap> croppedLocked = new List<Bitmap>();
            List<Bitmap> croppedUnlocked = new List<Bitmap>();

            // Maximum bounds across all medals to standardize canvas size if desired
            int maxW = 0;
            int maxH = 0;

            // First pass: extract masks and bounding boxes
            for (int i = 0; i < medals.Length; i++) {
                MedalDef m = medals[i];
                int x0 = colStarts[m.Col];
                int x1 = colEnds[m.Col];
                int y0 = rowStarts[m.Row];
                int y1 = rowEnds[m.Row];

                int cellW = x1 - x0 + 1;
                int cellH = y1 - y0 + 1;

                // Flood fill locked image within this cell to remove outer black background
                bool[,] isBg = new bool[cellW, cellH];
                Queue<Point> q = new Queue<Point>();

                // Seed queue with border pixels of the cell
                for (int x = 0; x < cellW; x++) {
                    Color pTop = lckBmp.GetPixel(x0 + x, y0);
                    if (Math.Max(pTop.R, Math.Max(pTop.G, pTop.B)) <= 10) {
                        isBg[x, 0] = true;
                        q.Enqueue(new Point(x, 0));
                    }
                    Color pBot = lckBmp.GetPixel(x0 + x, y1);
                    if (Math.Max(pBot.R, Math.Max(pBot.G, pBot.B)) <= 10) {
                        isBg[x, cellH - 1] = true;
                        q.Enqueue(new Point(x, cellH - 1));
                    }
                }
                for (int y = 0; y < cellH; y++) {
                    Color pLeft = lckBmp.GetPixel(x0, y0 + y);
                    if (Math.Max(pLeft.R, Math.Max(pLeft.G, pLeft.B)) <= 10 && !isBg[0, y]) {
                        isBg[0, y] = true;
                        q.Enqueue(new Point(0, y));
                    }
                    Color pRight = lckBmp.GetPixel(x1, y0 + y);
                    if (Math.Max(pRight.R, Math.Max(pRight.G, pRight.B)) <= 10 && !isBg[cellW - 1, y]) {
                        isBg[cellW - 1, y] = true;
                        q.Enqueue(new Point(cellW - 1, y));
                    }
                }

                while (q.Count > 0) {
                    Point pt = q.Dequeue();
                    Point[] neighbors = new Point[] {
                        new Point(pt.X + 1, pt.Y),
                        new Point(pt.X - 1, pt.Y),
                        new Point(pt.X, pt.Y + 1),
                        new Point(pt.X, pt.Y - 1)
                    };
                    foreach (Point n in neighbors) {
                        if (n.X >= 0 && n.X < cellW && n.Y >= 0 && n.Y < cellH) {
                            if (!isBg[n.X, n.Y]) {
                                Color pix = lckBmp.GetPixel(x0 + n.X, y0 + n.Y);
                                if (Math.Max(pix.R, Math.Max(pix.G, pix.B)) <= 10) {
                                    isBg[n.X, n.Y] = true;
                                    q.Enqueue(n);
                                }
                            }
                        }
                    }
                }

                // Find bounding box uniting unlocked and locked foregrounds
                int minX = cellW, maxX = 0;
                int minY = cellH, maxY = 0;

                for (int cy = 0; cy < cellH; cy++) {
                    for (int cx = 0; cx < cellW; cx++) {
                        Color uP = unlBmp.GetPixel(x0 + cx, y0 + cy);
                        bool uFg = uP.A > 15;
                        bool lFg = !isBg[cx, cy];

                        if (uFg || lFg) {
                            if (cx < minX) minX = cx;
                            if (cx > maxX) maxX = cx;
                            if (cy < minY) minY = cy;
                            if (cy > maxY) maxY = cy;
                        }
                    }
                }

                int bw = maxX - minX + 1;
                int bh = maxY - minY + 1;
                if (bw > maxW) maxW = bw;
                if (bh > maxH) maxH = bh;

                Console.WriteLine(string.Format("Medal {0}: BoundingBox ({1},{2}) W={3} H={4}", m.Name, minX, minY, bw, bh));
            }

            // Standardized canvas size for all medals (maxW + 12 padding, maxH + 12 padding)
            // Centered cleanly
            int canvasW = maxW + 12;
            int canvasH = maxH + 12;
            Console.WriteLine(string.Format("Standard canvas size: {0}x{1}", canvasW, canvasH));

            for (int i = 0; i < medals.Length; i++) {
                MedalDef m = medals[i];
                int x0 = colStarts[m.Col];
                int x1 = colEnds[m.Col];
                int y0 = rowStarts[m.Row];
                int y1 = rowEnds[m.Row];
                int cellW = x1 - x0 + 1;
                int cellH = y1 - y0 + 1;

                // Re-run flood fill for locked
                bool[,] isBg = new bool[cellW, cellH];
                Queue<Point> q = new Queue<Point>();
                for (int x = 0; x < cellW; x++) {
                    Color pTop = lckBmp.GetPixel(x0 + x, y0);
                    if (Math.Max(pTop.R, Math.Max(pTop.G, pTop.B)) <= 10) { isBg[x, 0] = true; q.Enqueue(new Point(x, 0)); }
                    Color pBot = lckBmp.GetPixel(x0 + x, y1);
                    if (Math.Max(pBot.R, Math.Max(pBot.G, pBot.B)) <= 10) { isBg[x, cellH - 1] = true; q.Enqueue(new Point(x, cellH - 1)); }
                }
                for (int y = 0; y < cellH; y++) {
                    Color pLeft = lckBmp.GetPixel(x0, y0 + y);
                    if (Math.Max(pLeft.R, Math.Max(pLeft.G, pLeft.B)) <= 10 && !isBg[0, y]) { isBg[0, y] = true; q.Enqueue(new Point(0, y)); }
                    Color pRight = lckBmp.GetPixel(x1, y0 + y);
                    if (Math.Max(pRight.R, Math.Max(pRight.G, pRight.B)) <= 10 && !isBg[cellW - 1, y]) { isBg[cellW - 1, y] = true; q.Enqueue(new Point(cellW - 1, y)); }
                }
                while (q.Count > 0) {
                    Point pt = q.Dequeue();
                    Point[] neighbors = new Point[] {
                        new Point(pt.X + 1, pt.Y), new Point(pt.X - 1, pt.Y),
                        new Point(pt.X, pt.Y + 1), new Point(pt.X, pt.Y - 1)
                    };
                    foreach (Point n in neighbors) {
                        if (n.X >= 0 && n.X < cellW && n.Y >= 0 && n.Y < cellH) {
                            if (!isBg[n.X, n.Y]) {
                                Color pix = lckBmp.GetPixel(x0 + n.X, y0 + n.Y);
                                if (Math.Max(pix.R, Math.Max(pix.G, pix.B)) <= 10) {
                                    isBg[n.X, n.Y] = true;
                                    q.Enqueue(n);
                                }
                            }
                        }
                    }
                }

                // Find bounding box for this medal
                int minX = cellW, maxX = 0;
                int minY = cellH, maxY = 0;
                for (int cy = 0; cy < cellH; cy++) {
                    for (int cx = 0; cx < cellW; cx++) {
                        Color uP = unlBmp.GetPixel(x0 + cx, y0 + cy);
                        bool uFg = uP.A > 15;
                        bool lFg = !isBg[cx, cy];
                        if (uFg || lFg) {
                            if (cx < minX) minX = cx;
                            if (cx > maxX) maxX = cx;
                            if (cy < minY) minY = cy;
                            if (cy > maxY) maxY = cy;
                        }
                    }
                }

                int bw = maxX - minX + 1;
                int bh = maxY - minY + 1;
                int offsetX = (canvasW - bw) / 2;
                int offsetY = (canvasH - bh) / 2;

                Bitmap destUnl = new Bitmap(canvasW, canvasH, PixelFormat.Format32bppArgb);
                Bitmap destLck = new Bitmap(canvasW, canvasH, PixelFormat.Format32bppArgb);

                for (int cy = 0; cy < bh; cy++) {
                    for (int cx = 0; cx < bw; cx++) {
                        int srcX = x0 + minX + cx;
                        int srcY = y0 + minY + cy;
                        int dstX = offsetX + cx;
                        int dstY = offsetY + cy;

                        Color uP = unlBmp.GetPixel(srcX, srcY);
                        if (uP.A > 0) {
                            destUnl.SetPixel(dstX, dstY, uP);
                        } else {
                            destUnl.SetPixel(dstX, dstY, Color.FromArgb(0, 0, 0, 0));
                        }

                        // For locked: if it is background (from flood fill), alpha = 0.
                        // If it is foreground, retain pixel color with alpha = 255.
                        // Also, if unlocked has alpha = 0 and locked pixel is near black (<= 15), make it transparent for clean edge.
                        bool isLockedBg = isBg[minX + cx, minY + cy];
                        Color lP = lckBmp.GetPixel(srcX, srcY);
                        int lMax = Math.Max(lP.R, Math.Max(lP.G, lP.B));

                        if (isLockedBg || (uP.A == 0 && lMax <= 15)) {
                            destLck.SetPixel(dstX, dstY, Color.FromArgb(0, 0, 0, 0));
                        } else {
                            destLck.SetPixel(dstX, dstY, Color.FromArgb(255, lP.R, lP.G, lP.B));
                        }
                    }
                }

                string unlFile = Path.Combine(outDir, m.Name + "_unlocked.png");
                string lckFile = Path.Combine(outDir, m.Name + "_locked.png");
                destUnl.Save(unlFile, ImageFormat.Png);
                destLck.Save(lckFile, ImageFormat.Png);

                croppedUnlocked.Add(destUnl);
                croppedLocked.Add(destLck);

                Console.WriteLine(string.Format("Saved {0}_unlocked.png and {0}_locked.png", m.Name));
            }

            // Create composite previews
            // 1. Preview Locked (8 side by side)
            // 2. Preview Unlocked (8 side by side)
            // 3. Combined preview (2 rows of 8)
            int prevW = canvasW * 8;
            int prevH = canvasH * 2;

            using (Bitmap previewBmp = new Bitmap(prevW, prevH, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(previewBmp)) {
                g.Clear(Color.FromArgb(255, 24, 24, 32)); // Dark gaming background for contrast
                
                // Draw checkered pattern subtly to show transparency
                using (Brush checkBrush = new SolidBrush(Color.FromArgb(255, 32, 32, 42))) {
                    for (int py = 0; py < prevH; py += 16) {
                        for (int px = 0; px < prevW; px += 16) {
                            if (((px / 16) + (py / 16)) % 2 == 0) {
                                g.FillRectangle(checkBrush, px, py, 16, 16);
                            }
                        }
                    }
                }

                for (int i = 0; i < 8; i++) {
                    // Row 0: Locked
                    g.DrawImage(croppedLocked[i], i * canvasW, 0);
                    // Row 1: Unlocked
                    g.DrawImage(croppedUnlocked[i], i * canvasW, canvasH);
                }

                previewBmp.Save(Path.Combine(outDir, "preview_medalhas_todas.png"), ImageFormat.Png);
                Console.WriteLine("Saved preview_medalhas_todas.png");
            }

            using (Bitmap prevLockBmp = new Bitmap(prevW, canvasH, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(prevLockBmp)) {
                g.Clear(Color.FromArgb(255, 24, 24, 32));
                for (int i = 0; i < 8; i++) g.DrawImage(croppedLocked[i], i * canvasW, 0);
                prevLockBmp.Save(Path.Combine(outDir, "preview_bloqueadas.png"), ImageFormat.Png);
                Console.WriteLine("Saved preview_bloqueadas.png");
            }

            using (Bitmap prevUnlBmp = new Bitmap(prevW, canvasH, PixelFormat.Format32bppArgb))
            using (Graphics g = Graphics.FromImage(prevUnlBmp)) {
                g.Clear(Color.FromArgb(255, 24, 24, 32));
                for (int i = 0; i < 8; i++) g.DrawImage(croppedUnlocked[i], i * canvasW, 0);
                prevUnlBmp.Save(Path.Combine(outDir, "preview_desbloqueadas.png"), ImageFormat.Png);
                Console.WriteLine("Saved preview_desbloqueadas.png");
            }

            // Dispose individual bitmaps
            foreach (Bitmap b in croppedUnlocked) b.Dispose();
            foreach (Bitmap b in croppedLocked) b.Dispose();
        }
    }
}
"@

Add-Type -TypeDefinition $sourceCode -ReferencedAssemblies System.Drawing
[MedalExtractor]::Run((Get-Location).Path)
