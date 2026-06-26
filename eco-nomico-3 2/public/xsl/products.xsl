<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:eco="https://eco-nomico.local/ns/catalog">

    <xsl:output method="html" indent="yes" encoding="UTF-8"
                doctype-system="about:legacy-compat"/>

    <xsl:template match="/catalog">
        <html lang="it">
            <head>
                <meta charset="UTF-8"/>
                <title>Catalogo XML — Eco-Nomico</title>
                <link rel="stylesheet"
                      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"/>
                <link rel="stylesheet" href="/css/style.css"/>
            </head>
            <body data-page="xml-feed" data-theme="light">
                <header class="container py-4">
                    <h1 class="section-title">Catalogo prodotti — Vista XML+XSLT</h1>
                    <p class="text-muted-eco">Catalogo completo dei prodotti.</p>
                </header>

                <main class="container">

                    <section class="filters mb-4">
                        <h3>Riepilogo</h3>
                        <ul class="mb-0">
                            <li>Prodotti totali:
                                <strong><xsl:value-of select="count(products/product)"/></strong>
                            </li>
                            <li>Prezzo medio:
                                <strong>€
                                    <xsl:value-of select="format-number(
                                        sum(products/product/price) div count(products/product), '0.00')"/>
                                </strong>
                            </li>
                            <li>Stock totale:
                                <strong>
                                    <xsl:value-of select="sum(products/product/stock)"/>
                                </strong>
                            </li>
                            <li>Eco-score massimo:
                                <strong>
                                    <xsl:for-each select="products/product/eco:score">
                                        <xsl:sort select="number(.)" data-type="number" order="descending"/>
                                        <xsl:if test="position()=1"><xsl:value-of select="."/></xsl:if>
                                    </xsl:for-each>
                                </strong>
                            </li>
                            <li>Categorie distinte:
                                <strong>
                                    <xsl:value-of select="count(products/product/category[
                                        not(. = preceding::product/category)])"/>
                                </strong>
                            </li>
                            <li>Generato il:
                                <strong><xsl:value-of select="@generated"/></strong>
                            </li>
                        </ul>
                    </section>

                    <!-- Lista prodotti per categoria -->
                    <h2 class="section-title">Prodotti</h2>
                    <div class="row g-4 product-grid">
                        <xsl:apply-templates select="products/product">
                            <xsl:sort select="category"/>
                            <xsl:sort select="name"/>
                        </xsl:apply-templates>
                    </div>

                    <p class="mt-4">
                        <a href="/index.html" class="btn-eco-outline">Torna alla home</a>
                    </p>
                </main>

            </body>
        </html>
    </xsl:template>

    
    <xsl:template match="product">
        <div class="col-6 col-md-4 col-lg-3">
            <article class="product-card">
                <img class="product-card__image" loading="lazy">
                    <xsl:attribute name="src"><xsl:value-of select="image"/></xsl:attribute>
                    <xsl:attribute name="alt"><xsl:value-of select="name"/></xsl:attribute>
                </img>
                <div class="product-card__body">
                    <div class="product-card__category">
                        <xsl:value-of select="category"/>
                    </div>
                    <h3 class="product-card__name">
                        <xsl:value-of select="name"/>
                        <span class="product-card__eco">
                            Eco <xsl:value-of select="eco:score"/>/10
                        </span>
                    </h3>
                    <p class="text-muted-eco small">
                        <xsl:value-of select="substring(description, 1, 100)"/>...
                    </p>
                    <div class="product-card__price">
                        € <xsl:value-of select="format-number(price, '0.00')"/>
                    </div>
                    <small class="text-muted-eco d-block mt-1">
                        <xsl:choose>
                            <xsl:when test="number(rating/@count) &gt; 0">
                                ★ <xsl:value-of select="rating/@average"/>
                                (<xsl:value-of select="rating/@count"/> recensioni)
                            </xsl:when>
                            <xsl:otherwise>Nessuna recensione</xsl:otherwise>
                        </xsl:choose>
                    </small>
                    <small class="text-muted-eco d-block">
                        <xsl:choose>
                            <xsl:when test="number(stock) &gt; 10">
                                ✓ Disponibile (<xsl:value-of select="stock"/> pezzi)
                            </xsl:when>
                            <xsl:when test="number(stock) &gt; 0">
                                ⚠ Scorte limitate (<xsl:value-of select="stock"/>)
                            </xsl:when>
                            <xsl:otherwise>✗ Esaurito</xsl:otherwise>
                        </xsl:choose>
                    </small>
                </div>
            </article>
        </div>
    </xsl:template>

</xsl:stylesheet>
