from .boci_scraper import BOCIScraper
from .bosera_scraper import BoseraScraper
from .csop_scraper import CsopScraper
from .chinaamc_scraper import ChinaamcScraper
from .globalx_scraper import GlobalXScraper
from .ishares_scraper import ISharesScraper
from model.page_result import PageResult
from .pingan_scraper import PingAnScraper
from .premia_scraper import PremiaScraper

__all__ = [
    "PageResult",
    "GlobalXScraper",
    "ISharesScraper",
    "BOCIScraper",
    "PingAnScraper",
    "BoseraScraper",
    "CsopScraper",
    "ChinaamcScraper",
    "PremiaScraper",
]

