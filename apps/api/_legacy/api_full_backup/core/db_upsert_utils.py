from typing import Any

from core.db_product_utils import _product_key


def _produit_conflict_key(product: dict, user_id: int | None) -> tuple[str, int | None]:
    return (_product_key(product), user_id)


def _dedupe_products_for_batch_upsert(products: list[dict], user_id: int | None) -> list[dict]:
    """Derniere occurrence gagne, aligne sur l'upsert sequentiel."""
    by_key: dict[tuple[str, int | None], dict] = {}
    for p in products:
        by_key[_produit_conflict_key(p, user_id)] = p
    return list(by_key.values())


def _column_arrays_for_upsert(
    products: list[dict], source: str, user_id: int | None, upsert_params_fn
) -> tuple[list[Any], ...]:
    """25 listes paralleles pour unnest (meme ordre que _upsert_params)."""
    cols: list[list[Any]] = [[] for _ in range(25)]
    for product in products:
        t = upsert_params_fn(product, source, user_id)
        for i, v in enumerate(t):
            cols[i].append(v)
    return tuple(cols)

