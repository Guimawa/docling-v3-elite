from services.dedup_service import check_duplicate, designation_score, fournisseur_score


def test_designation_identique():
    assert designation_score("Tube PER 16mm", "Tube PER 16mm") >= 0.99


def test_designation_casse_et_espaces():
    assert designation_score("TUBE PER 16MM", "tube per 16 mm") >= 0.85


def test_designation_permutation_tokens():
    assert designation_score("PER tube 16mm diametre", "tube diametre 16mm PER") >= 0.85


def test_designation_different():
    assert designation_score("Tube PER 16mm", "Ciment Portland 25kg") < 0.5


def test_designation_proche_mais_pas_doublon():
    assert designation_score("Tube PER 16mm", "Tube PER 20mm") < 0.85


def test_fournisseur_identique():
    assert fournisseur_score("Point P", "Point P") >= 0.99


def test_fournisseur_typo():
    assert fournisseur_score("Point P", "PointP") >= 0.85


def test_fournisseur_different():
    assert fournisseur_score("Point P", "Cedeo") < 0.5


def test_fournisseur_meme_enseigne_ville_differente():
    assert fournisseur_score("Point P", "Point P") >= 0.99


CATALOGUE = [
    {"id": 1, "designation_fr": "Tube PER 16mm", "fournisseur": "Point P"},
    {"id": 2, "designation_fr": "Tube PER 16mm", "fournisseur": "Cedeo"},
    {"id": 3, "designation_fr": "Ciment Portland CEM I 25kg", "fournisseur": "Point P"},
]


def test_doublon_exact():
    is_dup, match, _ = check_duplicate("Tube PER 16mm", "Point P", CATALOGUE)
    assert is_dup is True
    assert match["id"] == 1


def test_pas_doublon_fournisseur_different():
    is_dup, _, _ = check_duplicate("Tube PER 16mm", "Rexel", CATALOGUE)
    assert is_dup is False


def test_doublon_casse_differente():
    is_dup, match, _ = check_duplicate("TUBE PER 16MM", "point p", CATALOGUE)
    assert is_dup is True
    assert match["id"] == 1


def test_meme_fournisseur_produit_different():
    is_dup, _, _ = check_duplicate("Tube cuivre 14mm", "Point P", CATALOGUE)
    assert is_dup is False


def test_doublon_cedeo_independant():
    is_dup, match, _ = check_duplicate("tube per 16 mm", "Cedeo", CATALOGUE)
    assert is_dup is True
    assert match["id"] == 2


def test_produit_nouveau():
    is_dup, _, _ = check_duplicate("Robinet thermostatique", "Point P", CATALOGUE)
    assert is_dup is False
