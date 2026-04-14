"""Site-specific scrapers. Each module targets one provider or page family."""

from .globalx_scraper import GlobalXPageResult, GlobalXScraper
from .ishares_scraper import ISharesPageResult, ISharesScraper
from .boci_scraper import BOCIPageResult, BOCIScraper
from .pingan_scraper import PingAnPageResult, PingAnScraper
from .bosera_scraper import BoseraPageResult, BoseraScraper

__all__ = [
    "GlobalXScraper",
    "GlobalXPageResult",
    "ISharesScraper",
    "ISharesPageResult",
    "BOCIScraper",
    "BOCIPageResult",
    "PingAnScraper",
    "PingAnPageResult",
    "BoseraScraper",
    "BoseraPageResult",
]
