package shellparse

import "testing"

func TestSplitTopLevel(t *testing.T) {
	cmds := Parse(`echo "a && b" && rm -rf ./dist`)
	if len(cmds) != 2 {
		t.Fatalf("expected 2 commands, got %d: %+v", len(cmds), cmds)
	}
	if cmds[0].Argv[0] != "echo" {
		t.Errorf("cmds[0].Argv[0] = %q, want echo", cmds[0].Argv[0])
	}
	if cmds[1].Argv[0] != "rm" {
		t.Errorf("cmds[1].Argv[0] = %q, want rm", cmds[1].Argv[0])
	}
}

func TestCommandSubstitutionIsExtracted(t *testing.T) {
	cmds := Parse(`echo $(rm -rf /tmp/x)`)
	found := false
	for _, c := range cmds {
		if len(c.Argv) > 0 && c.Argv[0] == "rm" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected the rm inside $(...) to be extracted as its own command, got %+v", cmds)
	}
}

func TestBashDashCPayloadRecursed(t *testing.T) {
	cmds := Parse(`bash -c "rm -rf /tmp/y"`)
	found := false
	for _, c := range cmds {
		if len(c.Argv) > 0 && c.Argv[0] == "rm" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected bash -c payload to be recursed into, got %+v", cmds)
	}
}

func TestCommentStripped(t *testing.T) {
	cmds := Parse(`echo hi # rm -rf /`)
	if len(cmds) != 1 {
		t.Fatalf("expected 1 command, got %d: %+v", len(cmds), cmds)
	}
	if cmds[0].Argv[len(cmds[0].Argv)-1] == "/" {
		t.Errorf("comment was not stripped: %+v", cmds[0])
	}
}

func TestUnbalancedQuoteMarkedUnparsed(t *testing.T) {
	cmds := Parse(`echo "unterminated`)
	if len(cmds) != 1 || !cmds[0].Unparsed {
		t.Fatalf("expected a single Unparsed command, got %+v", cmds)
	}
}
