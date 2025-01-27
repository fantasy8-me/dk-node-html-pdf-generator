const express = require('express');
const ejs = require('ejs');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs').promises;


const app = express();
const port = process.env.PORT || 3000;
console.log('CHROME_PATH',process.env.CHROME_PATH);

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// 静态文件服务
app.use(express.static('public'));

// 首页路由
app.get('/', (req, res) => {
  res.render('index', { title: 'PDF生成器' });
});

// PDF生成路由
app.get('/generate-pdf', async (req, res) => {
  try {
    // const browser = await puppeteer.launch();
    
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH, // Replace with your Chrome path
      headless: true, // Run in headless mode (no GUI)
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Optional flags for Linux
    });    
    const page = await browser.newPage();
    
    // 渲染模板
    const templateName = req.query.template || 'pdf-template';
    // 处理项目列表
    const items = req.query.items ? 
      req.query.items.split('\n').filter(item => item.trim()) : 
      [];
    
    const logo = await getBase64FromPath(path.join(__dirname, 'templates', `sample.png`));
    const html = await ejs.renderFile(
      path.join(__dirname, 'templates', `${templateName}.ejs`),
      { 
        data: {
          ...req.query,
          items,
          logo
        }
      }
    );
    
    // await page.setContent(html);
    await page.setContent(html, { waitUntil: ["load", "networkidle0", "domcontentloaded"], });
    // 生成PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    // 验证PDF文件
    if (!pdfBuffer || pdfBuffer.length < 100) {
      throw new Error('Invalid PDF generated');
    }

    // 创建PDF目录
    const fs = require('fs');
    const pdfDir = path.join(__dirname, 'pdfstore');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir);
    }
    
    // 保存PDF到本地
    const fileName = `pdf_${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);
    // await fs.promises.writeFile(filePath, pdfBuffer);

    // 返回PDF文件
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="generated.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Transfer-Encoding', 'binary');
    res.write(pdfBuffer, 'binary');
    res.end();
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});



async function getBase64FromPath(filePath) {
  const data = await fs.readFile(filePath);// don't specify the enconding, then return buffer instead of string
  // const buffer = Buffer.from(data, 'binary');
  return data.toString('base64');
}